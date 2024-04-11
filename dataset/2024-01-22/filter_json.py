import json
import os
from download_videos import get_video_url

def filter_json():
    """
    Filter the JSON dataset.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct the path to the input and output files
    input_file_path = os.path.join(current_dir, 'metadata_ijmond_jan_22_2024.json')
    output_file_path = os.path.join(current_dir, 'metadata_new.json')
        
    try:

        with open(input_file_path, 'r') as file:
            data = json.load(file)

        # Filter the entries and transform the data
        filtered_data = []
        for entry in data:
            if entry['label_state_admin'] in (47, 32):
                video_url = get_video_url(entry)
                filtered_entry = {
                    'cam_id': entry['camera_id'],
                    'view_id': entry['view_id'],
                    'url': video_url
                }
                filtered_data.append(filtered_entry)
        
        print(f"Filtered {len(filtered_data)} entries.")

        with open(output_file_path, 'w') as file:
            print(f"Writing filtered data to {output_file_path}")
            json.dump(filtered_data, file, indent=4)
            
        print("Filtering complete.")
        
    except FileNotFoundError:
        print("File not found.")
    except json.JSONDecodeError:
        print("Error decoding JSON from the file.")
    except Exception as e:
        print(f"An error occurred: {e}")

filter_json()