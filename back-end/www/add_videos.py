from models.model_operations.video_operations import create_video
import json
import numpy as np
import sys
from app.app import app


def main(argv):
    if len(argv) > 1:
        with open(argv[1]) as f:
            data = np.array(json.load(f))
            for i in range(len(data)):
                print("------------------------------------------------")
                fn = data[i]["file_name"]
                st = data[i]["start_time"]
                et = None
                up = data[i]["url_part"]
                vid = data[i]["view_id"]
                cid = data[i]["camera_id"]
                with app.app_context():
                    video = create_video(fn, st, et, up, vid, cid)
                    print(video)
    else:
        print("Usage: python add_videos.py [video_json_path]")
        print("Example: python add_videos.py ../data/video_dataset_testing.json")
        print("Example: python add_videos.py ../data/video_dataset_1.json")


if __name__ == "__main__":
    main(sys.argv)