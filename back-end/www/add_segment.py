"""
Important: before running this script, you must run the following:
$ python add_videos.py ../data/video_dataset_1.json
"""

from models.model_operations.segmentationMask_operations import create_segmentation
import json
import numpy as np
import sys
from app.app import app

# The priority of this batch of frames
PRIORITY = 1


def main(argv):
    if len(argv) > 1:
        with open(argv[1]) as f:
            data = np.array(json.load(f))
            for i in range(len(data)):
                print("------------------------------------------------")
                mask_fn = data[i]["mask_file_name"]
                img_fn = data[i]["image_file_name"]
                f_nbr = data[i]["frame_number"]
                v_id = data[i]["video_id"]
                relative_boxes = data[i]["relative_boxes"]
                x_bbox = relative_boxes["x"]
                y_bbox = relative_boxes["y"]
                w_bbox = relative_boxes["w"]
                h_bbox = relative_boxes["h"]
                img_w = data[i]["cropped_width"]
                img_h = data[i]["cropped_height"]
                pr = PRIORITY
                fp = data[i]["file_path"]

                with app.app_context():
                    video = create_segmentation(mask_fn, img_fn, x_bbox, y_bbox, w_bbox, h_bbox,
                                                img_w, img_h, f_nbr, v_id, pr, fp)
                    print(video)
    else:
        print("Usage: python add_segment.py [segment_json_path]")
        print("Example: python add_segment.py ../data/segmentation_dataset_testing.json")


if __name__ == "__main__":
    main(sys.argv)
