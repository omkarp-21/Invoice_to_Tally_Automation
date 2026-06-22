import os
import cv2
import numpy as np
from pdf2image import convert_from_path

class DocumentProcessor:
    def __init__(self, max_processing_dim=800, target_ocr_width=1800, shave_offset=8, poppler_path = r"C:\Program Files\poppler-26.02.0\Library\bin"):
        self.max_dim = max_processing_dim
        self.target_width = target_ocr_width
        self.shave_offset = shave_offset
        self.poppler_path = poppler_path
    
    def load_file_to_matrix(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            pages = convert_from_path(
                file_path, 
                first_page=1, 
                last_page=1, 
                poppler_path=self.poppler_path
            )
            if not pages:
                raise ValueError(f"Failed to parse or convert PDF file: {file_path}")
                
            return cv2.cvtColor(np.array(pages[0]), cv2.COLOR_RGB2BGR)
        else:
            img = cv2.imread(file_path)
            if img is None:
                raise FileNotFoundError(f"Could not read image file path: {file_path}")
            return img

    @staticmethod
    def get_distance(p1, p2):
        return np.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def order_corners(self, pts):
        rect = np.zeros((4, 2), dtype=np.float32)
        sums = np.sum(pts, axis=1)
        diffs = np.diff(pts, axis=1)

        # Order -> top-left, top-right, bottom-right, bottom-left
        rect[0] = pts[np.argmin(sums)]
        rect[1] = pts[np.argmin(diffs)]
        rect[2] = pts[np.argmax(sums)]
        rect[3] = pts[np.argmax(diffs)]
        return rect

    def detect_document_corners(self, img):
        orig_h, orig_w = img.shape[:2]
        scale = self.max_dim / max(orig_w, orig_h)

        resized = cv2.resize(img, (int(orig_w * scale), int(orig_h * scale)))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        blurred = cv2.bilateralFilter(gray, 9, 75, 75)

        high_thresh, _ = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        low_thresh = 0.5 * high_thresh
        edged = cv2.Canny(blurred, low_thresh, high_thresh)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        morphed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(morphed, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

        total_canvas_area = orig_w * orig_h
        document_contour = None
        for c in contours:
            perimeter = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * perimeter, True)
            if len(approx) == 4:
                shape_area = cv2.contourArea(approx)

                if shape_area > (0.25 * total_canvas_area):
                    document_contour = approx.reshape(4, 2)
                    break

        if document_contour is None:
            raise ValueError("Could not confidently isolate a 4-corner document boundary.")

        ordered_scaled_rect = self.order_corners(document_contour)
        ordered_scaled_rect /= scale
        return ordered_scaled_rect

    def warp_perspective(self, img, rect):
        
        max_width = int(max(self.get_distance(rect[0], rect[1]), self.get_distance(rect[2], rect[3])))
        max_height = int(max(self.get_distance(rect[0], rect[3]), self.get_distance(rect[1], rect[2])))

        output_map = np.float32([
            [0, 0], 
            [max_width - 1, 0], 
            [max_width - 1, max_height - 1], 
            [0, max_height - 1]
        ])

        M = cv2.getPerspectiveTransform(rect, output_map)
        warped = cv2.warpPerspective(img, M, (max_width, max_height))

        shaved_warped = warped[
            self.shave_offset : max_height - self.shave_offset, 
            self.shave_offset : max_width - self.shave_offset
        ]
        return shaved_warped

    def post_process(self, warped_img):
        height, width = warped_img.shape[:2]

        if width != self.target_width:
            scale_factor = self.target_width / width
            new_height = int(height * scale_factor)
            
            if scale_factor < 1:
                interp_method = cv2.INTER_AREA
            else:
                interp_method = cv2.INTER_CUBIC
                
            warped_rescaled = cv2.resize(
                warped_img, (self.target_width, new_height), interpolation=interp_method
            )
        else:
            warped_rescaled = warped_img

        gray = cv2.cvtColor(warped_rescaled, cv2.COLOR_BGR2GRAY)

        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        contrast_enhanced = clahe.apply(gray)

        return contrast_enhanced

    def process_invoice(self, file_path):
        raw_matrix = self.load_file_to_matrix(file_path)
        try:
            # For Unscanned Images
            corners = self.detect_document_corners(raw_matrix)
            print("📸 Smartphone photo detected. Warping perspective...")
            processed_doc = self.warp_perspective(raw_matrix, corners)
            
        except ValueError:
            # Found to be scanned -> skip
            print("📄 Clean scan/PDF detected. Skipping warp step and processing directly...")
            processed_doc = raw_matrix

        try:
            final_binary = self.post_process(processed_doc)
            return final_binary
        except Exception as e:
            raise RuntimeWarning(f"Pipeline processing failed during enhancement: {str(e)}")