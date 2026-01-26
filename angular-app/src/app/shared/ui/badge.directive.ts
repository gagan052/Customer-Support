import { Directive, Input, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status badges
        resolved: "status-resolved",
        pending: "status-pending",
        escalated: "status-escalated",
        // Confidence badges
        "confidence-high": "confidence-high",
        "confidence-medium": "confidence-medium",
        "confidence-low": "confidence-low",
        // Intent badges
        intent: "bg-accent/20 text-accent border-accent/30",
        // Sentiment badges
        positive: "bg-success/20 text-success border-success/30",
        neutral: "bg-muted text-muted-foreground border-muted-foreground/30",
        negative: "bg-destructive/20 text-destructive border-destructive/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

@Directive({
  selector: '[appBadge]'
})
export class BadgeDirective implements OnInit {
  @Input() variant: BadgeVariants['variant'] = 'default';
  @Input() class: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    const classes = cn(badgeVariants({ variant: this.variant }), this.class);
    classes.split(' ').forEach(cls => {
      if (cls) this.renderer.addClass(this.el.nativeElement, cls);
    });
  }
}
