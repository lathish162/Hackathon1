import pandas as pd
import numpy as np
import os

def get_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the great-circle distance between two points 
    on the Earth in meters using the Haversine formula.
    """
    try:
        # Earth radius in meters
        R = 6371000 
        phi1, phi2 = np.radians(float(lat1)), np.radians(float(lat2))
        dphi = np.radians(float(lat2 - lat1))
        dlambda = np.radians(float(lon2 - lon1))
        
        a = np.sin(dphi / 2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        return R * c
    except (ValueError, TypeError, Exception):
        return float('inf')

def process_dataframe(name):
    """
    Cleans input CSVs by standardizing coordinate columns (Lat/Lon).
    """
    if os.path.exists(name):
        df = pd.read_csv(name)
        # Clean column names for easier mapping
        df.columns = df.columns.str.lower().str.strip()
        
        # Identify Lat/Lon columns even if they have slightly different names
        rename_map = {col: 'lat' for col in df.columns if 'lat' in col}
        rename_map.update({col: 'lon' for col in df.columns if 'lon' in col or 'lng' in col})
        
        df = df.rename(columns=rename_map)
        
        if 'lat' in df.columns and 'lon' in df.columns:
            # Force numeric conversion and drop malformed data
            df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
            df['lon'] = pd.to_numeric(df['lon'], errors='coerce')
            return df.dropna(subset=['lat', 'lon'])
            
    return pd.DataFrame(columns=['lat', 'lon', 'name'])

def find_nearest_haven(u_lat, u_lon, haven_df):
    """
    Identifies the single closest safe haven from the user's current location.
    """
    if haven_df.empty: 
        return None, float('inf')
        
    temp_df = haven_df.copy()
    temp_df['dist'] = temp_df.apply(
        lambda r: get_distance(u_lat, u_lon, r['lat'], r['lon']), axis=1
    )
    
    nearest_idx = temp_df['dist'].idxmin()
    return temp_df.loc[nearest_idx], temp_df.loc[nearest_idx]['dist']

def get_threat_samples(folder_path):
    """
    Recursively scans the 'threat_data' folder to find audio samples
    and labels them based on their sub-folder name (e.g., 'Scream', 'Help').
    """
    audio_data = []
    if os.path.exists(folder_path):
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file.lower().endswith(('.wav', '.mp3')):
                    # Use the immediate folder name as the threat label
                    label = os.path.basename(root)
                    full_path = os.path.abspath(os.path.join(root, file))
                    audio_data.append({
                        'file_name': file, 
                        'label': label, 
                        'full_path': full_path
                    })
    return pd.DataFrame(audio_data)

def calculate_safety_score(dist_to_risk, hour):
    """
    Proactive Intelligence: Calculates a safety percentage based on 
    environmental context and time. Triggers 'Ghost Mode' if score < 40.
    """
    score = 100
    
    # 1. Temporal Risk: Night hours (9 PM - 4 AM) increase vulnerability
    if hour >= 21 or hour <= 4:
        score -= 30
        
    # 2. Proximity Risk: Distance to known crime hotspots
    if dist_to_risk < 100:
        score -= 50  # Critical Risk Zone (Inside)
    elif dist_to_risk < 250:
        score -= 20  # Caution Zone (Near)
        
    return max(0, score)