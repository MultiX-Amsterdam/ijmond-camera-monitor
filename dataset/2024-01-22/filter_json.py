import json
import os

def filter_json():
    """
    Filter the JSON dataset.
    """
    # Define the path to the current script's directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct the path to the input and output files
    input_file_path = os.path.join(current_dir, 'metadata_ijmond_jan_22_2024.json')
    output_file_path = os.path.join(current_dir, 'metadata_new.json')
        
    try:
        # Open the input file
        with open(input_file_path, 'r') as file:
            data = json.load(file)

            # Filter the data for 32 and 47 as label state; golden negative and positive respectively, 
            # which means we are 100% certain in what we have smoke wise
            filtered_data = [entry for entry in data if entry['label_state_admin'] in [32, 47]]
            print(f"Filtered data length: {len(filtered_data)}")

        # Open the output file
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