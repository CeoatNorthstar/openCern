from manim import *
import random

class StartupLogo(Scene):
    def construct(self):
        self.camera.background_color = "#04060b"

        # 1. Particles Colliding
        center = ORIGIN
        left_p = Circle(radius=0.1, color=BLUE, fill_opacity=1).shift(LEFT * 5)
        right_p = Circle(radius=0.1, color=RED, fill_opacity=1).shift(RIGHT * 5)
        
        self.add(left_p, right_p)
        self.play(
            left_p.animate.move_to(center),
            right_p.animate.move_to(center),
            run_time=0.4,
            rate_func=rate_functions.linear
        )
        self.remove(left_p, right_p)
        flash = Dot(center, radius=0.1, color=WHITE)
        self.add(flash)
        self.play(flash.animate.scale(30).set_opacity(0), run_time=0.2, rate_func=rate_functions.rush_into)

        # 2. Spread lines
        num_lines = 45
        lines = VGroup()
        colors = ["#ffffff", "#60a5fa", "#3b82f6", "#e0f2fe"]
        
        for _ in range(num_lines):
            angle = random.uniform(0, TAU)
            length = random.uniform(4, 9)
            end_p = center + np.array([np.cos(angle) * length, np.sin(angle) * length, 0])
            ctrl_p = center + np.array([np.cos(angle - 0.5) * length * 0.5, np.sin(angle - 0.5) * length * 0.5, 0])
            line = CubicBezier(center, ctrl_p, end_p, end_p, color=random.choice(colors), stroke_width=2)
            lines.add(line)
            
        self.play(Create(lines, lag_ratio=0.01), run_time=0.6, rate_func=rate_functions.ease_out_expo)

        # 3. Logo Parts
        # Text OpenCERN
        logo_text = Text("OpenCERN", font="sans-serif", weight=BOLD).scale(1.2).shift(RIGHT * 1.5)
        logo_text.set_color(WHITE)
        
        # Door Frame
        door_frame = Rectangle(height=2.0, width=1.4, color=WHITE, stroke_width=4).shift(LEFT * 2.5)
        
        # Open door (perspectively opened)
        door_panel = Polygon(
            door_frame.get_corner(UL),
            door_frame.get_corner(DL),
            door_frame.get_corner(DR) + LEFT*0.3 + UP*0.2,
            door_frame.get_corner(UR) + LEFT*0.3 + DOWN*0.2,
            color="#60a5fa", stroke_width=2
        ).set_fill("#60a5fa", opacity=0.0) # Start empty

        # Particle icon (React Atom style) inside door
        atom = VGroup()
        orbit1 = Ellipse(width=0.8, height=0.3, color="#60a5fa", stroke_width=2).rotate(PI/3)
        orbit2 = Ellipse(width=0.8, height=0.3, color="#60a5fa", stroke_width=2).rotate(-PI/3)
        orbit3 = Ellipse(width=0.8, height=0.3, color="#60a5fa", stroke_width=2).rotate(PI/2)
        core = Dot(radius=0.06, color=WHITE)
        atom.add(orbit1, orbit2, orbit3, core).scale(0.8).move_to(door_frame.get_center())
        
        logo_outlines = VGroup(door_frame, door_panel, atom, logo_text)
        
        # Transform lines into the shapes of the logo
        self.play(
            ReplacementTransform(lines, logo_outlines),
            run_time=1.5,
            rate_func=rate_functions.ease_in_out_cubic
        )
        
        # Fill it with white and light blue
        door_panel_filled = door_panel.copy().set_fill("#60a5fa", opacity=0.2)
        atom_filled = atom.copy()
        atom_filled[3].set_fill(WHITE) # Core
        
        self.play(
            Transform(door_panel, door_panel_filled),
            Transform(atom, atom_filled),
            logo_text.animate.set_color_by_gradient("#ffffff", "#60a5fa"),
            run_time=0.8
        )
        self.wait(1.5)
