from rapidocr_onnxruntime import RapidOCR

class InvoiceOCR:
    def __init__(self):
        self.engine = RapidOCR()

    def extract_text(self, image):
        result, elapse_list = self.engine(image, use_cls=False)
        if not result:
            return ""
        text_lines = [line[1] for line in result]
        text_block = "\n".join(text_lines)
        return text_block, elapse_list
    