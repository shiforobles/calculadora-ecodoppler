/**
 * Motility SVG - Bull's-Eye 17-Segment AHA Model
 * Single precise mathematical diagram with all functionality
 */

class MotilitySVG {
    constructor(controller) {
        this.controller = controller;
        this.svgNS = "http://www.w3.org/2000/svg";

        // Vista apical activa en el filtro (null = sin filtro)
        this.vistaActiva = null;
        this.COLOR_APEX = "#e2e8f0";

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
        this.bindViewButtons();
    }

    renderBullseye() {
        try {
            // Check dependencies
            if (typeof MotilityModel === 'undefined') {
                console.error("❌ MotilityModel no está cargado. Verifique imports en index.html");
                return;
            }

            const svg = document.getElementById('svg-bullseye');
            if (!svg) {
                console.warn("⚠️ SVG container #svg-bullseye not found");
                return;
            }

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

            // El apical cap queda en gris y no se puede tocar: está fuera del WMSI
            // (que usa 16 segmentos) y fuera de la redacción. Se mantiene a la vista
            // por su valor anatómico, pero no representa un estado de motilidad.
            apex.setAttribute("fill", this.COLOR_APEX);
            apex.setAttribute("stroke", "#94a3b8");
            apex.setAttribute("style", "cursor: default;");

            const title17 = document.createElementNS(this.svgNS, "title");
            title17.textContent = 'Apical cap — no incluido en el análisis de motilidad/WMSI';
            apex.appendChild(title17);

            svg.appendChild(apex);

            // Apex label
            const textApex = document.createElementNS(this.svgNS, "text");
            textApex.setAttribute("x", this.cx);
            textApex.setAttribute("y", this.cy);
            textApex.setAttribute("class", "segment-number-bullseye");
            textApex.textContent = "17";
            svg.appendChild(textApex);

            // El resaltado sobrevive a un re-render
            this.aplicarResaltado();

            // Apex Artery Label
            const textApexArtery = document.createElementNS(this.svgNS, "text");
            textApexArtery.setAttribute("x", this.cx);
            textApexArtery.setAttribute("y", this.cy + 10);
            textApexArtery.setAttribute("class", "anatomy-label");
            textApexArtery.setAttribute("style", "font-size: 8px; font-weight: normal; opacity: 0.8;");
            svg.appendChild(textApexArtery);
        } catch (error) {
            console.error("Error rendering bullseye:", error);
        }
    }

    // Helper to create SVG arc path
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
        if (parseInt(segmentId) === 17) return;   // el apical cap no cambia de color

        const state = this.controller.getSegmentState(segmentId);
        const color = MotilityModel.STATES[state].color;

        const element = document.getElementById(`seg_${segmentId}`);
        if (element) {
            element.setAttribute('fill', color);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FILTRO POR VISTA
    //
    // Resalta los segmentos que se ven en una vista apical y atenúa el resto. Es
    // puramente visual: no marca nada como patológico ni toca el estado. Sirve para
    // saber qué toca evaluar en el plano que se está mirando.
    // ─────────────────────────────────────────────────────────────────────────

    /** Activa una vista, o la desactiva si ya estaba activa. @returns {string|null} */
    setVista(vista) {
        this.vistaActiva = (this.vistaActiva === vista) ? null : vista;
        this.aplicarResaltado();
        this.sincronizarBotones();
        return this.vistaActiva;
    }

    aplicarResaltado() {
        const visibles = this.vistaActiva ? MotilityModel.VIEWS[this.vistaActiva] : null;

        MotilityModel.ANALYZED_SEGMENTS.forEach(id => {
            const el = document.getElementById(`seg_${id}`);
            if (!el) return;

            if (!visibles) {                       // sin filtro: todo vuelve a su aspecto normal
                el.setAttribute('opacity', '1');
                el.setAttribute('stroke', '#ffffff');
                el.setAttribute('stroke-width', '2');
            } else if (visibles.includes(id)) {
                el.setAttribute('opacity', '1');
                el.setAttribute('stroke', '#0369a1');
                el.setAttribute('stroke-width', '4');
            } else {
                el.setAttribute('opacity', '0.25');
                el.setAttribute('stroke', '#ffffff');
                el.setAttribute('stroke-width', '2');
            }
        });
    }

    /** Deja los botones de vista reflejando cuál está activa */
    sincronizarBotones() {
        document.querySelectorAll('[data-vista]').forEach(btn => {
            btn.setAttribute('aria-pressed', btn.dataset.vista === this.vistaActiva ? 'true' : 'false');
        });
    }

    /**
     * Engancha los botones de vista que haya en la página. Vive acá y no en cada
     * página para que la app principal y el eco en cama compartan el mismo filtro.
     */
    bindViewButtons() {
        document.querySelectorAll('[data-vista]').forEach(btn => {
            if (btn.dataset.vistaBound) return;
            btn.dataset.vistaBound = '1';
            btn.addEventListener('click', () => this.setVista(btn.dataset.vista));
        });
        this.sincronizarBotones();
    }

    handleSegmentClick(segmentId) {
        this.controller.toggleSegment(segmentId);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotilitySVG;
}
