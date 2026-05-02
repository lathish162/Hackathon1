import streamlit as st
import pandas as pd
import pydeck as pdk
import librosa
import librosa.display
import numpy as np
import matplotlib.pyplot as plt
import os
from datetime import datetime
from watch_bridge import (
    process_dataframe, 
    find_nearest_haven, 
    get_threat_samples, 
    get_distance, 
    calculate_safety_score
)

st.set_page_config(page_title="Nari-Dhwani AI: Digital Guardian", layout="wide")

# --- DATA LOAD ---
crime_data = process_dataframe('crime_dataset_india.csv')
safe_havens = process_dataframe('safe_havens.csv')
threat_dataset = get_threat_samples('threat_data')

# --- SIDEBAR: PROACTIVE SIMULATION CONTROLS ---
st.sidebar.header("🕹️ Simulation Controls")
sim_lat = st.sidebar.slider("User Latitude", 12.9000, 12.9800, 12.9400, format="%.4f")
sim_lon = st.sidebar.slider("User Longitude", 77.5800, 77.6500, 77.6300, format="%.4f")
sim_hour = st.sidebar.slider("Time of Day (24h)", 0, 23, datetime.now().hour)

st.sidebar.markdown("---")
st.sidebar.subheader("⌚ Wearable Sensors")
hr_val = st.sidebar.slider("Heart Rate (BPM)", 60, 170, 85)
rot_val = st.sidebar.slider("Wrist Rotation Speed (°/s)", 0, 1500, 450)
internet_status = st.sidebar.toggle("Internet Access", value=True)

st.title("🛡️ Nari-Dhwani: Proactive Intelligence")
col_main, col_watch = st.columns([2, 1])

# --- LOGIC CALCULATION ---
# 1. Proximity to Risk
min_dist = float('inf')
for _, row in crime_data.iterrows():
    d = get_distance(sim_lat, sim_lon, row['lat'], row['lon'])
    if d < min_dist: min_dist = d

# 2. Emergency Triggers
safety_score = calculate_safety_score(min_dist, sim_hour)
ghost_active = safety_score < 40
sensor_sos = (hr_val > 145) or (rot_val > 1100)
is_emergency = ghost_active or sensor_sos

with col_main:
    # 🚨 ALERT SYSTEM (The 3 Layers)
    if min_dist < 100 or sensor_sos:
        st.error("🚨 STRONG ALERT: Dangerous Zone or Physical Stress Detected. Emergency contacts notified.")
    elif min_dist < 250:
        st.warning("⚠️ SOFT ALERT: High-risk zone within 250m. Suggesting 'Green Path'.")
    else:
        st.success("🟢 STATUS: Safe Environment")

    # 🗺️ LIVE SAFETY MAP
    nearest_haven, haven_dist = find_nearest_haven(sim_lat, sim_lon, safe_havens)
    
    layers = [
        # Heatmap of Crime Data (Red/Yellow Zones)
        pdk.Layer("HeatmapLayer", crime_data, get_position=['lon', 'lat'], radius_pixels=60, intensity=0.9,
                  color_range=[[255, 255, 178], [254, 204, 92], [253, 141, 60], [240, 59, 32], [189, 0, 38]]),
        # Green Safety Zones (Scatterplot)
        pdk.Layer("ScatterplotLayer", safe_havens, get_position=['lon', 'lat'], get_color=[0, 255, 0, 160], get_radius=100),
        # Current User Position
        pdk.Layer("ScatterplotLayer", pd.DataFrame([{'lat': sim_lat, 'lon': sim_lon}]), 
                  get_position=['lon', 'lat'], get_color=[0, 150, 255], get_radius=40)
    ]

    # Safe Routing (The Green Path)
    if (min_dist < 250 or is_emergency) and nearest_haven is not None:
        path = pd.DataFrame([{"start": [sim_lon, sim_lat], "end": [nearest_haven['lon'], nearest_haven['lat']]}])
        layers.append(pdk.Layer("LineLayer", path, get_source_position="start", get_target_position="end", 
                                get_color=[34, 139, 34, 255], get_width=6))

    st.pydeck_chart(pdk.Deck(layers=layers, initial_view_state=pdk.ViewState(latitude=sim_lat, longitude=sim_lon, zoom=14), map_style='light'))

    # 🔊 ACOUSTIC THREAT ANALYSIS
    st.subheader("🔊 Acoustic Fingerprinting")
    if not threat_dataset.empty:
        c1, c2 = st.columns([1, 2])
        with c1:
            sel_cat = st.selectbox("Threat Category", threat_dataset['label'].unique())
            files = threat_dataset[threat_dataset['label'] == sel_cat]
            sel_file = st.selectbox("Sample Clip", files['file_name'])
            sample_path = files[files['file_name'] == sel_file]['full_path'].values[0]
        with c2:
            if st.button("▶️ Analyze Voice Signature"):
                st.audio(sample_path)
                y, sr = librosa.load(sample_path)
                fig, ax = plt.subplots(figsize=(10, 2))
                librosa.display.waveshow(y, sr=sr, ax=ax, color='#ff4b4b')
                st.pyplot(fig)

with col_watch:
    # 👻 GHOST MODE STATUS
    st.subheader("👻 Ghost Mode")
    score_color = "red" if ghost_active else "#00ff00"
    st.markdown(f"""
        <div style="background-color: #1e1e1e; padding: 20px; border-radius: 15px; border: 2px solid {score_color}; text-align: center;">
            <h2 style="color: {score_color}; margin:0;">{safety_score}/100</h2>
            <p style="color: #aaa;">Safety Score</p>
            <strong style="color: {score_color};">{'GHOST MODE ACTIVE' if ghost_active else 'MONITORING'}</strong>
        </div>
    """, unsafe_allow_html=True)

    if not internet_status and is_emergency:
        st.warning("📶 Offline Mode: Location sent via SMS.")

    st.markdown("---")

    # ⌚ WATCH LINK CARD
    st.subheader("⌚ Wearable Link")
    card_bg = "#4a0e0e" if sensor_sos else "#1e1e1e"
    card_border = "#ff4b4b" if sensor_sos else "#00ff00"
    
    st.markdown(f"""
    <div style="background-color: {card_bg}; padding: 25px; border-radius: 20px; border: 4px solid {card_border}; text-align: center; color: white;">
        <h1 style="font-size: 50px; margin: 0;">{hr_val}</h1>
        <p style="margin: 0; color: #aaa;">BPM</p>
        <hr style="border: 1px solid #444;">
        <h2 style="margin: 10px 0;">{rot_val} °/s</h2>
        <p style="margin: 0; color: #aaa;">Wrist Rotation</p>
        <h3 style="color: {card_border}; margin-top: 20px;">
            {'🚨 SOS TRIGGERED' if sensor_sos else '🟢 SENSORS NORMAL'}
        </h3>
    </div>
    """, unsafe_allow_html=True)
    
    st.info(f"📍 User at: {sim_lat:.4f}, {sim_lon:.4f}")

st.divider()
st.caption("Nari-Dhwani Women SafeGuard AI")