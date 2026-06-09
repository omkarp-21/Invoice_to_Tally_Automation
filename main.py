import cv2
import numpy as np

LiveFeed = False
cap = cv2.VideoCapture(0)
MAX_WIDTH = 480
MAX_HEIGHT = 640

if LiveFeed is True:
    while cap.isOpened():
        ret, frame = cap.read()

        cv2.imshow('Webcam Feed', frame)


        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()

else:
    img = cv2.imread("./Document.jpg")

    # Image Preprocessing
    img_resized = cv2.resize(img, (MAX_WIDTH, MAX_HEIGHT))
    img_gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    img_blurred = cv2.GaussianBlur(img_gray, (5,5), 0)

    # Edge Detection
    img_edged = cv2.Canny(img_blurred, 100, 200)
    kernel = np.ones((5,5), dtype=np.uint8)
    img_morphed = cv2.morphologyEx(img_edged, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Contour Detection
    contours, _ = cv2.findContours(img_morphed, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    img_contours = img_gray.copy()
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

    # Order : TOP-LEFT, TOP-RIGHT, BOTTOM-RIGHT, BOTTOM-LEFT
    rect[0] = document_contour[np.argmin(sums)]
    rect[1] = document_contour[np.argmin(diffs)]
    rect[2] = document_contour[np.argmax(sums)]
    rect[3] = document_contour[np.argmax(diffs)]
    document_contour = rect
    
    # Warping
    input_map = document_contour
    output_map = np.float32([[0,0], [MAX_WIDTH, 0], [MAX_WIDTH, MAX_HEIGHT], [0, MAX_HEIGHT]])
    matrix = cv2.getPerspectiveTransform(input_map, output_map)
    img_final = cv2.warpPerspective(img_resized, matrix, (MAX_WIDTH, MAX_HEIGHT))



    horizontal_stack = np.hstack((img_blurred, img_morphed, img_contours))
    cv2.imshow("Scanner", horizontal_stack)
    cv2.imshow("Final", img_final)
    cv2.waitKey(0)

cv2.destroyAllWindows()