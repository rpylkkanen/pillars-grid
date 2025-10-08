from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import trimesh
import io
import os
import time

from layouts import (
    generate_checkerboard,
    generate_hex_checkerboard,
    generate_hex_honeycomb_layout,
    generate_organic_hex_layout,
    get_positions_from_square_layout,
    get_positions_from_hex_layout,
    get_positions_from_organic_layout
)

from geometry import (
    create_pillars_from_positions,
    get_bounds_from_positions,
    create_floor_with_holes,
    create_walls_from_bounds
)

app = Flask(__name__, static_folder='.')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # Serve any static file (.js, .css, etc.)
    return send_from_directory('.', filename)

@app.route('/preview', methods=['POST'])
def preview():
    """Generate positions only for preview - lightweight, no 3D geometry"""
    params = request.json
    
    layout_type = params.get('layout_type', 'hex-checkerboard')
    rows = params.get('rows', 50)
    cols = params.get('cols', 50)
    spacing = params.get('spacing', 0.35)
    floor_padding_x = params.get('floor_padding_x', 0.25)
    floor_padding_y = params.get('floor_padding_y', 0.25)
    
    hole_probability = params.get('hole_probability', 0.2)
    jitter = params.get('jitter', 0.075)
    seed = params.get('seed', 42)
    
    # Get positions without creating 3D geometry
    if layout_type == 'square-checkerboard':
        layout = generate_checkerboard(rows, cols)
        pillar_positions, hole_positions = get_positions_from_square_layout(layout, spacing)
    elif layout_type == 'hex-checkerboard':
        layout = generate_hex_checkerboard(rows, cols)
        pillar_positions, hole_positions = get_positions_from_hex_layout(layout, spacing)
    elif layout_type == 'hex-honeycomb':
        layout = generate_hex_honeycomb_layout(rows, cols)
        pillar_positions, hole_positions = get_positions_from_hex_layout(layout, spacing)
    elif layout_type == 'organic':
        positions = generate_organic_hex_layout(rows, cols, hole_probability, jitter, spacing, seed)
        pillar_positions, hole_positions = get_positions_from_organic_layout(positions)
    
    all_positions = hole_positions + pillar_positions
    min_x, max_x, min_y, max_y = get_bounds_from_positions(all_positions, padding_x=floor_padding_x, padding_y=floor_padding_y)
    
    return jsonify({
        'pillars': [{'x': float(x), 'y': float(y)} for x, y in pillar_positions],
        'holes': [{'x': float(x), 'y': float(y)} for x, y in hole_positions],
        'bounds': {
            'minX': float(min_x),
            'maxX': float(max_x),
            'minY': float(min_y),
            'maxY': float(max_y)
        }
    })

@app.route('/generate', methods=['POST'])
def generate_stl():
    """Generate full STL file"""
    start_time = time.time()
    params = request.json
    
    layout_type = params.get('layout_type', 'hex-checkerboard')
    rows = params.get('rows', 50)
    cols = params.get('cols', 50)
    spacing = params.get('spacing', 0.35)
    pillar_radius = params.get('pillar_radius', 0.125)
    pillar_height = params.get('pillar_height', 10.0)
    hole_radius = params.get('hole_radius', 0.1)
    floor_thickness = params.get('floor_thickness', 2.0)
    floor_padding_x = params.get('floor_padding_x', 0.25)
    floor_padding_y = params.get('floor_padding_y', 0.25)
    wall_thickness = params.get('wall_thickness', 0.5)
    
    hole_probability = params.get('hole_probability', 0.2)
    jitter = params.get('jitter', 0.075)
    seed = params.get('seed', 42)
    
    # Generate layout and extract positions
    if layout_type == 'square-checkerboard':
        layout = generate_checkerboard(rows, cols)
        pillar_positions, hole_positions = get_positions_from_square_layout(layout, spacing)
    elif layout_type == 'hex-checkerboard':
        layout = generate_hex_checkerboard(rows, cols)
        pillar_positions, hole_positions = get_positions_from_hex_layout(layout, spacing)
    elif layout_type == 'hex-honeycomb':
        layout = generate_hex_honeycomb_layout(rows, cols)
        pillar_positions, hole_positions = get_positions_from_hex_layout(layout, spacing)
    elif layout_type == 'organic':
        positions = generate_organic_hex_layout(rows, cols, hole_probability, jitter, spacing, seed)
        pillar_positions, hole_positions = get_positions_from_organic_layout(positions)
    
    # Build geometry
    pillars = create_pillars_from_positions(pillar_positions, pillar_radius, pillar_height, floor_thickness)
    
    all_positions = hole_positions + pillar_positions
    min_x, max_x, min_y, max_y = get_bounds_from_positions(all_positions, padding_x=floor_padding_x, padding_y=floor_padding_y)
    
    floor = create_floor_with_holes(
        holes=hole_positions,
        floor_thickness=floor_thickness,
        padding_x=floor_padding_x,
        padding_y=floor_padding_y,
        hole_radius=hole_radius,
        bounds_positions=all_positions
    )
    
    walls = create_walls_from_bounds(
        min_x, max_x, min_y, max_y,
        wall_height=floor_thickness + pillar_height,
        wall_thickness=wall_thickness
    )
    
    # Union all parts
    model = trimesh.boolean.union([pillars, floor, walls])
    
    # Get dimensions
    bounds = model.bounds
    size = bounds[1] - bounds[0]
    
    # Export to memory
    output = io.BytesIO()
    model.export(output, file_type='stl')
    output.seek(0)
    
    elapsed = time.time() - start_time
    
    return send_file(
        output,
        mimetype='application/octet-stream',
        as_attachment=True,
        download_name=f'pillar_grid_{layout_type}.stl'
    ), 200, {
        'X-Generation-Time': f'{elapsed:.2f}',
        'X-Dimensions': f'{size[0]:.2f}x{size[1]:.2f}x{size[2]:.2f}'
    }

if __name__ == '__main__':
    app.run(debug=True, port=5000)