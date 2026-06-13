import math

def transform(x, y, angle, rotate_deg, scale_x, scale_y):
    # Apply scale first in local coordinates, then rotate
    sx = x * scale_x
    sy = y * scale_y
    
    # Rotate by rotate_deg clockwise
    rad = math.radians(rotate_deg)
    rx = sx * math.cos(rad) - sy * math.sin(rad)
    ry = sx * math.sin(rad) + sy * math.cos(rad)
    
    # Transform plane angle
    # Original angle is 45 degrees (pointing up-right)
    # in screen space: dx = cos(45), dy = -sin(45)
    dx = math.cos(math.radians(angle)) * scale_x
    dy = -math.sin(math.radians(angle)) * scale_y
    
    # Rotate vector by rotate_deg clockwise
    adx = dx * math.cos(rad) - dy * math.sin(rad)
    ady = dx * math.sin(rad) + dy * math.cos(rad)
    
    # Calculate final heading angle in degrees (relative to positive X, Y is down)
    heading = math.degrees(math.atan2(ady, adx))
    
    return rx, ry, heading

# Original points (relative to center of image):
# Start (End B): bottom-left (-0.5, 0.5)
# Loop: middle-top (0, -0.2)
# Plane (End A): top-right (0.5, -0.5)
# Plane original angle: 45 degrees (up-right, i.e. heading dx > 0, dy < 0)

points = {
    "Start": (-0.5, 0.5),
    "Loop": (0.0, -0.3),
    "Plane": (0.5, -0.5)
}

options = [
    # (rotate_deg, scale_x, scale_y)
    (-15, 1, 1), # original top-left
    (90, 1, 1),
    (90, -1, 1),
    (-90, -1, 1),
    (-90, 1, -1),
    (180, -1, 1),
    (-45, 1, -1),
    (-190, -1, 1),
    (170, -1, 1),
    (-10, 1, -1),
    (-120, -1, 1),
    (120, 1, -1),
    (-120, 1, -1),
    (45, -1, -1)
]

for opt in options:
    rot, sx, sy = opt
    print(f"Transform: rotate({rot}deg) scale({sx}, {sy})")
    res = {}
    for name, pt in points.items():
        rx, ry, heading = transform(pt[0], pt[1], 45, rot, sx, sy)
        res[name] = (round(rx, 2), round(ry, 2))
    # We want:
    # Start: top-left (rx < 0, ry < 0)
    # Loop: top-middle/left (rx <= 0, ry <= 0)
    # Plane: bottom-right (rx > 0, ry > 0)
    # Heading: pointing up-right (adx > 0, ady < 0, i.e. heading between -90 and 0)
    rx_p, ry_p, heading = transform(points["Plane"][0], points["Plane"][1], 45, rot, sx, sy)
    print(f"  Start: {res['Start']}, Loop: {res['Loop']}, Plane: {res['Plane']}")
    print(f"  Plane heading: {round(heading, 1)} deg")
    print("-" * 40)
