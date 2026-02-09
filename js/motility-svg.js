/**
 * Motility SVG - Bull's-Eye 17-Segment AHA Model
 * Single precise mathematical diagram with all functionality
 */

class MotilitySVG {
    constructor(controller) {
        this.controller = controller;
        this.svgNS = "http://www.w3.org/2000/svg";

        // Configuration
        this.cx = 200;
        this.cy = 200;
        this.r_apex = 40;   // Apex center circle
        this.r_apical = 90; // Apical ring
        this.r_mid = 140;   // Mid ring
        this.r_basal = 190; // Basal ring

        this.initializeView();

        this.controller.addListener((segmentId) => {
            this.updateSegmentVisuals(segmentId);
        });
    }

    initializeView() {
        this.renderBullseye();
    }

    renderBullseye() {
        const svg = document.getElementById('svg-bullseye');
        if (!svg) return;

        svg.innerHTML = '';
        svg.setAttribute('viewBox', '0 0 400 400');

        // Segment definitions (AHA 17-segment model - horizontal flip for correct orientation)
        // Anterior at top, Septal to LEFT, Lateral to RIGHT (as viewed from base)
        const segments = [
            // BASAL (1-6) - starting from Anterior, going clockwise with septal/lateral swapped
            { id: 1, name: "Bas Ant", ri: this.r_mid, re: this.r_basal, start: -30, end: 30 },
            { id: 6, name: "Bas ALat", ri: this.r_mid, re: this.r_basal, start: 30, end: 90 },     // was 2
            { id: 5, name: "Bas ILat", ri: this.r_mid, re: this.r_basal, start: 90, end: 150 },    // was 3
            { id: 4, name: "Bas Inf", ri: this.r_mid, re: this.r_basal, start: 150, end: 210 },
            { id: 3, name: "Bas ISep", ri: this.r_mid, re: this.r_basal, start: 210, end: 270 },   // was 5
            { id: 2, name: "Bas ASep", ri: this.r_mid, re: this.r_basal, start: 270, end: 330 },   // was 6

            // MEDIO (7-12) - starting from Anterior, going clockwise with septal/lateral swapped
            { id: 7, name: "Med Ant", ri: this.r_apical, re: this.r_mid, start: -30, end: 30 },
            { id: 12, name: "Med ALat", ri: this.r_apical, re: this.r_mid, start: 30, end: 90 },   // was 8
            { id: 11, name: "Med ILat", ri: this.r_apical, re: this.r_mid, start: 90, end: 150 },  // was 9
            { id: 10, name: "Med Inf", ri: this.r_apical, re: this.r_mid, start: 150, end: 210 },
            { id: 9, name: "Med ISep", ri: this.r_apical, re: this.r_mid, start: 210, end: 270 },  // was 11
            { id: 8, name: "Med ASep", ri: this.r_apical, re: this.r_mid, start: 270, end: 330 },  // was 12

            // APICAL (13-16) - 4 segments, Anterior at top with septal/lateral swapped
            { id: 13, name: "Api Ant", ri: this.r_apex, re: this.r_apical, start: -45, end: 45 },
            { id: 16, name: "Api Lat", ri: this.r_apex, re: this.r_apical, start: 45, end: 135 },  // was 14
            { id: 15, name: "Api Inf", ri: this.r_apex, re: this.r_apical, start: 135, end: 225 },
            { id: 14, name: "Api Sep", ri: this.r_apex, re: this.r_apical, start: 225, end: 315 } // was 16
        ];

        // Generate segments 1-16
        segments.forEach(seg => {
            const path = document.createElementNS(this.svgNS, "path");
            path.setAttribute("d", this.describeArc(this.cx, this.cy, seg.ri, seg.re, seg.start, seg.end));
            path.setAttribute("class", "bullseye-segment");
            path.setAttribute("id", `seg_${seg.id}`);
            path.setAttribute("data-segment-id", seg.id);

            const state = this.controller.getSegmentState(seg.id);
            path.setAttribute("fill", MotilityModel.STATES[state].color);

            path.onclick = () => this.controller.toggleSegment(seg.id);

            // Tooltip
            const title = document.createElementNS(this.svgNS, "title");
            title.textContent = `${seg.id}: ${MotilityModel.SEGMENTS[seg.id].name}`;
            path.appendChild(title);

            svg.appendChild(path);

            // Label
            const labelPos = this.polarToCartesian(this.cx, this.cy,
                seg.ri + (seg.re - seg.ri) / 2,
                (seg.start + seg.end) / 2);

            const text = document.createElementNS(this.svgNS, "text");
            text.setAttribute("x", labelPos.x);
            text.setAttribute("y", labelPos.y);
            text.setAttribute("class", "segment-number-bullseye");
            text.textContent = seg.id;
            svg.appendChild(text);

            // Artery Label
            const textArtery = document.createElementNS(this.svgNS, "text");
            textArtery.setAttribute("x", labelPos.x);
            textArtery.setAttribute("y", labelPos.y + 9); // Offset below number
            textArtery.setAttribute("class", "anatomy-label");
            // Bold, Black, slightly larger
            textArtery.setAttribute("style", "font-size: 9px; font-weight: 900; opacity: 1.0; fill: #000; text-shadow: 0px 0px 2px rgba(255,255,255,0.8);");

            // Get artery from model
            const artery = MotilityModel.SEGMENTS[seg.id].artery;
            textArtery.textContent = artery;
            svg.appendChild(textArtery);
        });

        // Generate segment 17 (Apex - center circle)
        const apex = document.createElementNS(this.svgNS, "circle");
        apex.setAttribute("cx", this.cx);
        apex.setAttribute("cy", this.cy);
        apex.setAttribute("r", this.r_apex);
        apex.setAttribute("class", "bullseye-segment");
        apex.setAttribute("id", "seg_17");
        apex.setAttribute("data-segment-id", "17");

        const state17 = this.controller.getSegmentState(17);
        apex.setAttribute("fill", MotilityModel.STATES[state17].color);

        apex.onclick = () => this.controller.toggleSegment(17);

        const title17 = document.createElementNS(this.svgNS, "title");
        title17.textContent = `17: ${MotilityModel.SEGMENTS[17].name}`;
        apex.appendChild(title17);

        svg.appendChild(apex);

        // Apex label
        const textApex = document.createElementNS(this.svgNS, "text");
        textApex.setAttribute("x", this.cx);
        textApex.setAttribute("y", this.cy);
        textApex.setAttribute("class", "segment-number-bullseye");
        textApex.textContent = "17";
        svg.appendChild(textApex);

        // Apex Artery Label
        const textApexArtery = document.createElementNS(this.svgNS, "text");
        textApexArtery.setAttribute("x", this.cx);
        textApexArtery.setAttribute("y", this.cy + 10);
        textApexArtery.setAttribute("class", "anatomy-label");
        textApexArtery.setAttribute("style", "font-size: 8px; font-weight: normal; opacity: 0.8;");
        textApexArtery.textContent = "DA"; // Apex is mainly DA
        svg.appendChild(textApexArtery);
    }

    // Create SVG arc path
    describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
        const start = this.polarToCartesian(x, y, outerRadius, endAngle);
        const end = this.polarToCartesian(x, y, outerRadius, startAngle);
        const start2 = this.polarToCartesian(x, y, innerRadius, endAngle);
        const end2 = this.polarToCartesian(x, y, innerRadius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        return [
            "M", start.x, start.y,
            "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
            "L", end2.x, end2.y,
            "A", innerRadius, innerRadius, 0, largeArcFlag, 1, start2.x, start2.y,
            "Z"
        ].join(" ");
    }

    // Convert polar to cartesian coordinates
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        // Subtract 90 so 0 degrees is at top (12 o'clock)
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    // Update segment visuals when state changes
    updateSegmentVisuals(segmentId) {
        if (segmentId === 'all') {
            this.renderBullseye();
            return;
        }

        const state = this.controller.getSegmentState(segmentId);
        const color = MotilityModel.STATES[state].color;

        const element = document.getElementById(`seg_${segmentId}`);
        if (element) {
            element.setAttribute('fill', color);
        }
    }

    handleSegmentClick(segmentId) {
        this.controller.toggleSegment(segmentId);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotilitySVG;
}
