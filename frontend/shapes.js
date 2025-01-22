export class Shape {
    constructor(start, end, color = "black", fillColor = null) {
        this.start = start;
        this.end = end;
        this.color = color;
        this.fillColor = fillColor;
    }

    draw(context) {
        throw new Error("Draw method not implemented!");
    }
}


export class Circle extends Shape {
    draw(context) {
        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        context.beginPath();
        context.arc(this.start.x, this.start.y, radius, 0, 2 * Math.PI);
        context.strokeStyle = this.color;
        context.stroke();

        if (this.fillColor) {
            context.fillStyle = this.fillColor;
            context.fill();
        }
    }
}

export class Rectangle extends Shape {
    draw(context) {
        const width = this.end.x - this.start.x;
        const height = this.end.y - this.start.y;

        context.beginPath();
        context.rect(this.start.x, this.start.y, width, height);
        context.strokeStyle = this.color;
        context.stroke();

        if (this.fillColor) {
            context.fillStyle = this.fillColor;
            context.fill();
        }
    }
}

export class Line extends Shape {
    draw(context) {
        context.beginPath();
        context.moveTo(this.start.x, this.start.y);
        context.lineTo(this.end.x, this.end.y);
        context.strokeStyle = this.color;
        context.stroke();
    }
}

export class Brush {
    constructor(color = "black", lineWidth = 2) {
        this.points = [];
        this.color = color;
        this.lineWidth = lineWidth;
    }

    addPoint(point) {
        this.points.push(point);
    }

    draw(context) {
        if (this.points.length < 2) return;

        context.beginPath();
        context.lineWidth = this.lineWidth;
        context.strokeStyle = this.color;

        for (let i = 0; i < this.points.length - 1; i++) {
            const start = this.points[i];
            const end = this.points[i + 1];
            context.moveTo(start.x, start.y);
            context.lineTo(end.x, end.y);
        }
        context.stroke();
    }
}
