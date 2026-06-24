from rapidocr_onnxruntime import RapidOCR

class InvoiceOCR:
    def __init__(self):
        self.engine = RapidOCR()

    def extract_text(self, image):
        result, elapse_list = self.engine(image, use_cls=False)
        
        if not result:
            return [], elapse_list

        layout_data = []
        for line in result:
            bbox = line[0]
            text = line[1]
            
            # Simplify bbox to top-left and bottom-right to minimize token usage for the LLM
            top_left = bbox[0]
            bottom_right = bbox[2]
            
            layout_data.append({
                "text": text,
                "box": [int(top_left[0]), int(top_left[1]), int(bottom_right[0]), int(bottom_right[1])]
            })
            
        return layout_data, elapse_list
    
    def coordinate_pre_sort(self, layout_data, y_threshold=10):
        if not layout_data:
            return ""

        # sort from top to bottom
        layout_data.sort(key=lambda item: item["box"][1])

        lines = []
        current_line = [layout_data[0]]

        for item in layout_data[1:]:
            current_ymin = item["box"][1]
            prev_ymin = current_line[-1]["box"][1]
            prev_ymax = current_line[-1]["box"][3]
            
            line_height = prev_ymax - prev_ymin
            actual_threshold = max(y_threshold, line_height * 0.5)

            if abs(current_ymin - prev_ymin) <= actual_threshold:
                current_line.append(item)
            else:
                lines.append(current_line)
                current_line = [item]
                
        if current_line:
            lines.append(current_line)

        # Sort each row from left to right
        reconstructed_text_rows = []
        for line in lines:
            line.sort(key=lambda item: item["box"][0])
            line_string = "  ".join([item["text"] for item in line])
            reconstructed_text_rows.append(line_string)

        return "\n".join(reconstructed_text_rows)
    