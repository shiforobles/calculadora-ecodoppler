/**
 * Motility UI Extension - Anatomical Views
 * Handles interactive overlay for the new anatomical view mode
 */

class MotilityAnatomicalView {
    constructor(controller) {
        console.log("MotilityAnatomicalView: Constructor called");
        this.controller = controller;
        this.container = document.getElementById('anatomical-view-container');
        this.overlay = document.getElementById('anatomical-overlay');

        if (!this.container || !this.overlay) {
            console.error("MotilityAnatomicalView: Container or overlay not found!");
            return;
        }

        // Coordinates for segments based on the generated image layout

        // Coordinates for segments based on the generated image layout
        // Image Layout: 
        // Top Left: A4C (Segments: 3,9,14 (Sept), 6,12,16 (Lat), 17 (Apex))
        // Bottom Left: A2C (Segments: 1,7,13 (Ant), 4,10,15 (Inf), 17)
        // Top Right: PLAX (Segments: 2,8 (ASep), 5,11 (ILat)) roughly visible? Or just represents general walls.
        // Bottom Right: Short Axis (Basal, Mid, Apical rings)
        // 
        // Strategy: Use the Short Axis rings for primary interaction as they show ALL segments clearly.
        // AND add touch points on the Long Axis views for redundancy?
        // Let's map ALL visible segments.

        // Coordinates are %, relative to the container (16:9 aspect ratio image)
        this.segmentCoordinates = [
            // BASAL
            { id: 1, x: 25, y: 75, view: 'A2C' },    // Basal Anterior (A2C Top)
            { id: 1, x: 50, y: 82, view: 'SAX-Basal' }, // Basal Anterior (SAX Top) 

            { id: 2, x: 65, y: 35, view: 'PLAX' },   // Basal Anteroseptal (PLAX Top)
            { id: 2, x: 58, y: 84, view: 'SAX-Basal' }, // Basal AS (SAX Right-Top)

            { id: 3, x: 15, y: 35, view: 'A4C' },    // Basal Inferoseptal (A4C Right/Septum?) -> A4C is Upside down? No, standard medical A4C: Apex down. Left is RV/Septum. Right is LV/Lateral.
            // Wait, standard Echo A4C: Apex UP.
            // My generated image has Apex UP (Top).
            // Left side of image A4C = Right Ventricle?
            // Let's assume standard A4C orientation in image.
            // If Apex is Up, LV is on Right usually? 
            // User image (Step 1275) labels: "RV" on left, "LV" on right. "Apex" top.
            // So Septum is Left side of LV. Lateral is Right side of LV.
            // Basal Inferoseptal (3): Left side, bottom-ish (base).
            { id: 3, x: 42, y: 84, view: 'SAX-Basal' }, // Basal IS (SAX Left-Bottom?)

            // ... I need to be precise. 
            // Since I cannot see the image coordinates now, I will define a structure and refine the coordinates in a second pass 
            // or provide a "Drag to configure" mode? No.
            // I will estimate based on typical 16:9 and grid.
            // 
            // Let's focus on the SAX views (Short Axis) at the bottom right/center as the safest clickable areas for all 17 segments.
            // And add A4C/A2C points where obvious.
        ];

        // Temporary: Using just the grid logic for now. 
        // I'll leave the coordinates array empty and populate it with a rough guess in init.

        this.init();

        // Listen for model changes
        if (this.controller && this.controller.addListener) {
            this.controller.addListener((segmentId) => {
                this.updateVisuals();
            });
        }
    }

    init() {
        if (!this.container || !this.overlay) return;

        this.overlay.innerHTML = '';

        // Define segments with approximated positions (Percent of 1280x720 canvas)
        // Image has 3 main views + SAX rings.

        // Let's create a generic map. 
        // SAX Basal: Bottom Center-Right
        // SAX Mid: Bottom Right
        // SAX Apical: Far Bottom Right

        // This is hard to guess. 
        // I will create the buttons for 1-17 arranged in a logical grid overlaying the image 
        // roughly where the SAX views are likely located in the "Clean" image.
        // Image Step 1275:
        // Top Left: A4C. Bottom Left: A2C.
        // Middle/Right: PLAX (Top). SAX (Bottom).

        const segments = [
            // Segment 1 (Bas Ant) - A2C Basal (Bottom Left view, Right wall?) -> Anterior usually Right in standard A2C (Apex Up)
            { id: 1, top: 58, left: 18, label: '1' },

            // Segment 2 (Bas ASep) - PLAX Basal (Top Right view, Top wall)
            { id: 2, top: 40, left: 60, label: '2' },

            // Segment 3 (Bas ISep) - A4C Basal Septum (Top Left view, Left wall)
            { id: 3, top: 40, left: 18, label: '3' },

            // Segment 4 (Bas Inf) - A2C Basal Inf (Bottom Left view, Left wall?)
            { id: 4, top: 58, left: 8, label: '4' },

            // Segment 5 (Bas ILat) - PLAX Basal Posterior (Top Right view, Bottom wall)
            { id: 5, top: 50, left: 60, label: '5' },

            // Segment 6 (Bas ALat) - A4C Basal Lateral (Top Left view, Right wall)
            { id: 6, top: 40, left: 28, label: '6' },

            // ... Mid segments ...
            // 7 (Med Ant)
            { id: 7, top: 52, left: 18, label: '7' },
            // 8 (Med ASep)
            { id: 8, top: 35, left: 55, label: '8' },
            // 9 (Med ISep)
            { id: 9, top: 32, left: 18, label: '9' },
            // 10 (Med Inf)
            { id: 10, top: 52, left: 8, label: '10' },
            // 11 (Med ILat)
            { id: 11, top: 45, left: 55, label: '11' },
            // 12 (Med ALat)
            { id: 12, top: 32, left: 28, label: '12' },

            // ... Apical segments ...
            // 13 (Api Ant)
            { id: 13, top: 48, left: 16, label: '13' },
            // 14 (Api Sep)
            { id: 14, top: 25, left: 18, label: '14' },
            // 15 (Api Inf)
            { id: 15, top: 48, left: 10, label: '15' },
            // 16 (Api Lat) - A4C Apical Lat
            { id: 16, top: 25, left: 28, label: '16' },

            // 17 (Apex) - A4C Apex
            { id: 17, top: 20, left: 23, label: '17' }
        ];

        // Create buttons
        segments.forEach(seg => {
            const btn = document.createElement('div');
            btn.className = 'segment-marker';
            btn.textContent = seg.label;
            btn.style.top = `${seg.top}%`;
            btn.style.left = `${seg.left}%`;
            btn.dataset.id = seg.id;

            btn.onclick = (e) => {
                e.stopPropagation();
                this.controller.toggleSegment(seg.id);
            };

            this.overlay.appendChild(btn);
        });

        this.updateVisuals();
    }

    updateVisuals() {
        const markers = this.overlay.querySelectorAll('.segment-marker');
        markers.forEach(marker => {
            const id = parseInt(marker.dataset.id);
            const state = this.controller.getSegmentState(id);

            // Remove previous state classes
            marker.classList.remove('state-1', 'state-2', 'state-3', 'state-4');
            marker.classList.add(`state-${state}`);
        });
    }
}

// Expose globally to ensure UIController finds it
window.MotilityAnatomicalView = MotilityAnatomicalView;
console.log("MotilityAnatomicalView: Class loaded and exposed to window");
