from manim import *
import random

class ParticleCollision(Scene):
    def construct(self):
        # Background
        self.camera.background_color = "#04070a"

        # Central collision point
        center = ORIGIN

        # Create incoming particles (protons/ions)
        left_particle = Circle(radius=0.15, color=BLUE, fill_opacity=1).shift(LEFT * 6)
        right_particle = Circle(radius=0.15, color=RED, fill_opacity=1).shift(RIGHT * 6)

        left_glow = left_particle.copy().scale(3).set_fill(BLUE, opacity=0.3).set_stroke(width=0)
        right_glow = right_particle.copy().scale(3).set_fill(RED, opacity=0.3).set_stroke(width=0)

        # Beam lines
        left_beam = DashedLine(LEFT * 6, center, color=BLUE, dash_length=0.1).set_opacity(0.5)
        right_beam = DashedLine(RIGHT * 6, center, color=RED, dash_length=0.1).set_opacity(0.5)
        
        self.add(left_beam, right_beam)
        self.add(left_glow, right_glow, left_particle, right_particle)

        # Animate incoming
        self.play(
            left_particle.animate.move_to(center),
            left_glow.animate.move_to(center),
            right_particle.animate.move_to(center),
            right_glow.animate.move_to(center),
            run_time=1.5,
            rate_func=rate_functions.linear
        )

        # Collision flash
        flash = Dot(center, radius=0.1, color=WHITE)
        self.add(flash)
        self.remove(left_particle, right_particle, left_glow, right_glow, left_beam, right_beam)
        
        self.play(flash.animate.scale(50).set_opacity(0), run_time=0.3, rate_func=rate_functions.rush_into)

        # Generate exiting particles (complex physics tracks)
        num_tracks = 40
        tracks = VGroup()
        particles = VGroup()
        
        colors = ["#00FFFF", "#FF00FF", YELLOW, GREEN, PURPLE, ORANGE, WHITE]

        for _ in range(num_tracks):
            angle = random.uniform(0, TAU)
            # Add slight curvature to simulate magnetic field
            curve_factor = random.uniform(-1, 1)
            length = random.uniform(3, 8)
            
            start_p = center
            end_p = center + np.array([np.cos(angle) * length, np.sin(angle) * length, 0])
            control_p = center + np.array([np.cos(angle - curve_factor) * length * 0.5, np.sin(angle - curve_factor) * length * 0.5, 0])
            
            color = random.choice(colors)
            track = CubicBezier(start_p, control_p, end_p, end_p, color=color, stroke_width=random.uniform(1, 3))
            track.set_opacity(0.7)
            
            particle = Dot(radius=random.uniform(0.02, 0.08), color=color)
            particle.move_to(center)
            
            tracks.add(track)
            particles.add(particle)

        # Animation of particle shower
        anims = []
        for i in range(num_tracks):
            anim = MoveAlongPath(particles[i], tracks[i], run_time=random.uniform(1.5, 3.5), rate_func=rate_functions.ease_out_expo)
            anims.append(anim)
            
        self.play(
            AnimationGroup(*anims, lag_ratio=0.01),
            FadeIn(tracks, run_time=0.5)
        )
        
        # Add some circular shockwaves
        for i in range(3):
            circle = Circle(radius=0.1, color=WHITE, stroke_width=2).move_to(center)
            self.play(circle.animate.scale(80).set_opacity(0), run_time=1.5, rate_func=rate_functions.linear)
            
        self.play(FadeOut(tracks, particles), run_time=1.5)
        self.wait(0.5)
