import cv2
import os

FRAMES_PER_SEC_KEY = 5
START = 4.0
END = 5.0


def generate_valid_frames(capture, start_frame, end_frame):

    frame_counter = 0
    while True:
        success, frame = capture.read()
        if not success:
            break
        frame_counter += 1
        if start_frame <= frame_counter <= end_frame:
            yield frame


def create_video_writer(original_filename, height, width, frames_per_sec):
    codec = cv2.cv.FOURCC('M', 'J', 'P', 'G')
    original_filename = original_filename.replace(".mp4", "")
    new_filename = "filtered_" + original_filename + ".avi"
    video_writer = cv2.VideoWriter(new_filename, codec, frames_per_sec, (width, height))
    return video_writer


for filename in os.listdir('.'):
# for filename in ["-6yv9ihhJ8w.mp4"]:
    if "mp4" not in filename or "filter" in filename:
        continue
    capture_path = filename
    capture = cv2.VideoCapture(capture_path)
    frames_per_sec = capture.get(FRAMES_PER_SEC_KEY)
    total_frames = capture.get(cv2.cv.CV_CAP_PROP_FRAME_COUNT)
    start_frame = int(frames_per_sec * START)
    end_frame = int(total_frames - (frames_per_sec * END))
    _, frame = capture.read()
    height, width = frame.shape[0: 2]
    video_writer = create_video_writer(filename, height, width, frames_per_sec)
    for good_frame in generate_valid_frames(capture, start_frame, end_frame):
        video_writer.write(good_frame)
    video_writer.release()
    print "finished %s" % filename
