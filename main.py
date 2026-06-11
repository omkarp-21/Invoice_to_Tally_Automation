import cv2
import numpy as np

def distance(p1, p2):
    return np.sqrt( (p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 )


LiveFeed = False
cap = cv2.VideoCapture(0)
MAX_DIM = 800

if LiveFeed is True:
    while cap.isOpened():
        ret, frame = cap.read()

        cv2.imshow('Webcam Feed', frame)


        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()

else:
    orig_img = cv2.imread("test/Document.jpg")
    orig_h, orig_w = orig_img.shape[:2]
    scale = MAX_DIM / max(orig_w, orig_h)

    # Image Preprocessing
    resized = cv2.resize(orig_img, (int(orig_w * scale), int(orig_h * scale)))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.bilateralFilter(gray, 9, 75, 75)

    # Edge Detection
    high_thres, _ = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    low_thres = 0.5 * high_thres
    edged = cv2.Canny(blurred, low_thres, high_thres)

    # Morphology
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    morphed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)

    # Contour Detection
    contours, _ = cv2.findContours(morphed, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    img_contours = gray.copy()
    cv2.drawContours(img_contours, contours, -1, (0,255,0), 5)

    # Contour Selection
    for c in contours:
        perimeter = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02*perimeter, True)
        if len(approx) == 4 and cv2.contourArea(approx) > 1000:
            document_contour = approx
            break
    print(document_contour.shape)

    # Finding Corners
    document_contour = document_contour.reshape(4, 2)
    rect = np.zeros((4,2), dtype=np.float32)
    sums = np.sum(document_contour, axis=1)
    diffs = np.diff(document_contour, axis=1)

    # Corner Ordering
    # Order : TOP-LEFT, TOP-RIGHT, BOTTOM-RIGHT, BOTTOM-LEFT
    rect[0] = document_contour[np.argmin(sums)]
    rect[1] = document_contour[np.argmin(diffs)]
    rect[2] = document_contour[np.argmax(sums)]
    rect[3] = document_contour[np.argmax(diffs)]

    rect /= scale
    document_contour = rect
    
    # Finding Appropriate Document Resolution
    max_width = int( max(distance(rect[0], rect[1]), distance(rect[2], rect[3])) )
    max_height = int( max(distance(rect[0], rect[3]), distance(rect[1], rect[2])) )


    # Warping
    input_map = document_contour
    output_map = np.float32([[0,0], [max_width-1, 0], [max_width-1, max_height-1], [0, max_height-1]])
    M = cv2.getPerspectiveTransform(input_map, output_map)
    img_final = cv2.warpPerspective(orig_img, M, (max_width, max_height))

    # Shaving the curved edges
    SHAVE_OFFSET = 8 
    img_final = img_final[
    SHAVE_OFFSET : max_height - SHAVE_OFFSET, 
    SHAVE_OFFSET : max_width - SHAVE_OFFSET
]

    print(img_final.shape)

    horizontal_stack = np.hstack((blurred, morphed, img_contours))
    # cv2.imshow("Scanner", horizontal_stack)
    # cv2.imshow("Original", img)
    cv2.imshow("Final", img_final)
    if cv2.waitKey(0) & 0xFF == ord('s'):
        cv2.imwrite("./result.jpg", img_final)
    # cv2.waitKey(0)

cv2.destroyAllWindows()