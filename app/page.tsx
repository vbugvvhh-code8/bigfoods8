'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PortalHome() {
  const states = ['Anambra', 'Delta', 'PH City', 'Lagos', 'Abuja'];
  const [currentStateIndex, setCurrentStateIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStateIndex((prev) => (prev + 1) % states.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* SLIM STICKY HEADER */}
      <header className="sticky-header">
        <div className="wrap">
          <nav>
            <div className="logo">
              <div className="logo-badge">
                <img 
                  src="https://dpioixansygkjdbphfdj.supabase.co/storage/v1/object/public/product-images/0.4927238865897102.webp" 
                  alt="BigFoods Logo" 
                />
              </div>
              <span className="logo-text">BigFoods</span>
            </div>

            <div className="nav-right">
              <div className="live-indicator">
                <span>Live in</span>
                <span className="green-dot"></span>
                <span className="state-name">{states[currentStateIndex]}</span>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <div className="wrap">
        <div className="hero">
          <div>
            <h1 className="headline">
              Subscribe to<br />
              your meals, <span className="accent">not<br />your stress.</span>
            </h1>
            <p className="lede">
              Pick a home kitchen you trust, set your plan, and let a rider
              collect it hot and bring it to your door — every day, on
              schedule, no re-ordering.
            </p>

            <div className="cta-row">
              <div className="hero-ctas">
                <Link href="/order" className="btn-primary sm">
                  Order food now
                </Link>
                <Link href="/restaurant-portal" className="btn-ghost sm">
                  Open your kitchen
                </Link>
                <Link href="/rider-portal" className="btn-ghost sm">
                  Become a rider
                </Link>
              </div>

              <Link href="/order" className="subscribe-float">
                <span className="sf-pill">Subscribe</span>
                <span className="sf-text">Subscribe to your favourite restaurant for constant meals</span>
                <span className="sf-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5l7 7-7 7" stroke="#241C14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </div>

            <div className="trust-row">
              <div className="avatars">
                <span className="a1">🍲</span>
                <span className="a2">🥘</span>
                <span className="a3">🍢</span>
                <span className="a4">+90</span>
              </div>
              <small>home kitchens already delivering weekly plans</small>
            </div>
          </div>

          <div className="hero-visual">
            <div className="rating-badge">
              <span className="stars">⭐ 4.8</span>
              <span className="rated-by">1,200+ happy diners</span>
            </div>
            <svg className="route-svg" viewBox="0 0 400 460" fill="none">
              <path
                d="M70 70 C 170 60, 190 190, 300 210 S 150 380, 90 400"
                stroke="#FF7A2E"
                strokeWidth="2"
                strokeDasharray="1 10"
                strokeLinecap="round"
              />
            </svg>
            <div className="stop-card stop1">
              <div className="tape"></div>
              <div className="ico">🍛</div>
              <div className="tag">Stop 01 · Kitchen</div>
              <h4>Mama Ngozi's Pot</h4>
              <p>Jollof + plantain, packed hot at 12:15pm</p>
            </div>
            <div className="stop-card stop2">
              <div className="ico">🏍️</div>
              <div className="tag">Stop 02 · Rider</div>
              <h4>Chidi is en route</h4>
              <p>Picked up · 6 mins to your street</p>
            </div>
            <div className="stop-card stop3">
              <div className="ico">🏠</div>
              <div className="tag">Stop 03 · Your door</div>
              <h4>Delivered, no re-order</h4>
              <p>Tomorrow's plate is already queued</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3D SUPPORTED MEALS SECTION */}
      <section className="meals-3d-showcase">
        <div className="wrap">
          <div className="sec-head" style={{ textAlign: 'center', margin: '0 auto 54px' }}>
            <p className="sec-eyebrow">our menu</p>
            <h2>Freshly packed, ready for you.</h2>
          </div>
          <div className="pouch-grid">
            
            {/* Package 1 */}
            <div className="pouch-card">
              <div className="pouch-3d-wrap">
                <div className="pouch-front native-bg">
                  <div className="pouch-label">Premium Bowl</div>
                  <h3>Native Dishes</h3>
                  <p>Authentic Jollof, Pounded Yam, and rich soups packed hot.</p>
                </div>
              </div>
            </div>

            {/* Package 2 */}
            <div className="pouch-card">
              <div className="pouch-3d-wrap zobo-wrap">
                <div className="pouch-front zobo-bg">
                  <div className="pouch-label">Chilled Drink</div>
                  <h3>Zobo</h3>
                  <p>Freshly brewed, iced hibiscus goodness to wash it down.</p>
                </div>
              </div>
            </div>

            {/* Package 3 */}
            <div className="pouch-card">
              <div className="pouch-3d-wrap ginger-wrap">
                <div className="pouch-front ginger-bg">
                  <div className="pouch-label">Health Boost</div>
                  <h3>Ginger Shots</h3>
                  <p>Cold-pressed ginger extracts for your daily energy kick.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* THE HANDOFF */}
      <section className="how" id="how">
        <div className="wrap">
          <div className="sec-head">
            <p className="sec-eyebrow">the handoff</p>
            <h2>Three stops, one plate that always arrives.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-ico">🍳</div>
              <h3>A home kitchen cooks</h3>
              <p>Verified sellers cook your plan for the day, right in their own kitchen — not a commercial line, just real home cooking.</p>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-ico">🏍️</div>
              <h3>A rider collects it</h3>
              <p>No seller has to leave the stove. A BigFoods rider picks up your plate the moment it's packed and moves straight to your address.</p>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-ico">🍽️</div>
              <h3>It reaches your door</h3>
              <p>Your subscription runs itself after that — same time, same standard, until you pause or change your plan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT THE APP DOES / FOR SELLERS */}
      <section id="sellers">
        <div className="wrap">
          <div className="sellers">
            <div className="seller-copy">
              <p className="sec-eyebrow">for home-based sellers</p>
              <h2 className="serif" style={{ fontSize: '2.1rem', fontWeight: 600, margin: '0 0 18px' }}>
                Cook! Our rider picks from you and delivers to hungry customers.
              </h2>
              <p className="lede">
                We built BigFoods to support home restaurants — no storefront, no limitations on
                where you live, and no complex sign-ups. Register your kitchen in minutes, start
                taking orders, and let subscribers lock in their favourite meals from you on the
                days they want them.
              </p>
              <div className="stat-row">
                <div className="stat">
                  <b>0</b>
                  <span>Storefront needed</span>
                </div>
                <div className="stat">
                  <b>1</b>
                  <span>Pickup point — your kitchen</span>
                </div>
                <div className="stat">
                  <b>92%</b>
                  <span>Sellers keep repeat subscribers</span>
                </div>
              </div>
            </div>
            <div className="recipe-cards">
              <div className="recipe-card">
                <div className="pin"></div>
                <h4>Subscribe to your best meal</h4>
                <p>Allow customers to lock in their favorite dishes from your kitchen on specific days of the week.</p>
              </div>
              <div className="recipe-card">
                <div className="pin"></div>
                <h4>No delivery hassle</h4>
                <p>Riders collect batch orders straight from your kitchen at set pickup windows.</p>
              </div>
              <div className="recipe-card">
                <div className="pin"></div>
                <h4>Paid on schedule</h4>
                <p>Weekly payouts straight to your account, no chasing customers for cash.</p>
              </div>
              <div className="recipe-card">
                <div className="pin"></div>
                <h4>Built-in trust badge</h4>
                <p>A verified home-kitchen stamp customers recognise and return for.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section>
        <div className="wrap">
          <div className="testimonial">
            <div className="stamp">
              <div className="stamp-inner">
                <b>Verified<br />Home Kitchen</b>
                <span>SINCE 2024</span>
              </div>
            </div>
            <div className="quote">
              <p>"I used to hawk food by okada myself. Now I just cook — BigFoods sends a rider, and my customers get a fresh plate before it goes cold. My kitchen finally pays like a business."</p>
              <cite>
                Ngozi Eze<span>Home seller, Amawbia Road, Awka</span>
              </cite>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div className="wrap">
        <div className="final">
          <h2 className="serif">Your next plate is one tap away.</h2>
          <Link className="btn-primary" href="/order" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Order food now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <footer>
          <span>BigFoods · serving Awka, Anambra</span>
          <div className="flinks">
            <Link href="#how">How it works</Link>
            <Link href="#sellers">Sell with us</Link>
          </div>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        :root {
          --cream: #FFFFFF;
          --paper: #FFFFFF;
          --char: #241C14;
          --clay: #FF7A2E;
          --clay-dark: #E65C00;
          --palm: #345E43;
          --palm-soft: #E4EEE7;
          --amber: #E3A857;
          --amber-soft: #FFF4E5;
          --line: #EBEBEB;
          --muted: #8A7A68;
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          background: var(--cream);
          color: var(--char);
          font-family: 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        a { color: inherit; }
        .wrap { max-width: 1160px; margin: 0 auto; padding: 0 32px; }
        .serif { font-family: 'Fraunces', serif; }
        .mark-font { font-family: 'Caveat', cursive; }

        /* ---------------- SLIM STICKY HEADER ---------------- */
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 999;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--line);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.3s ease;
        }
        nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 0; /* Slimmer padding so it takes less space when scrolling */
        }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-badge {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 16px -8px rgba(230, 92, 0, 0.55);
          overflow: hidden;
          background: #fff;
        }
        .logo-badge img { width: 100%; height: 100%; object-fit: cover; }
        .logo-text { font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.25rem; }
        
        .nav-right { display: flex; align-items: center; gap: 30px; font-size: 0.92rem; font-weight: 600; }
        .live-indicator {
          display: flex; align-items: center; gap: 8px;
          background: #f7f7f7;
          border: 1px solid var(--line);
          padding: 6px 14px;
          border-radius: 100px;
          color: var(--char);
        }
        .green-dot {
          width: 8px; height: 8px;
          background-color: #10B981;
          border-radius: 50%;
          animation: blink 1.5s infinite;
        }
        .state-name { width: 72px; font-weight: 700; transition: opacity 0.3s; }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media(max-width: 820px) { 
           .state-name { width: auto; }
        }

        /* ---------------- HERO ---------------- */
        .hero {
          padding: 56px 0 90px;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 56px;
          align-items: center;
        }
        h1.headline {
          font-size: clamp(2.2rem, 4.5vw, 3.4rem);
          line-height: 1.05;
          font-weight: 700;
          letter-spacing: -0.015em;
          margin: 0 0 22px;
        }
        h1.headline .accent { color: var(--clay); font-style: italic; font-weight: 600; }
        .hero p.lede {
          font-size: 1.12rem;
          line-height: 1.6;
          color: #4a4033;
          max-width: 480px;
          margin: 0 0 26px;
        }

        /* CTA row */
        .cta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .hero-ctas { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-primary {
          background: var(--clay); color: #fff;
          padding: 15px 26px; border-radius: 100px;
          text-decoration: none; font-weight: 700; font-size: 0.96rem;
          box-shadow: 0 14px 26px -12px rgba(255, 122, 46, 0.5);
          display: inline-flex; align-items: center; gap: 8px;
          transition: transform 0.2s;
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-ghost {
          padding: 15px 24px; border-radius: 100px;
          border: 1.5px solid var(--line);
          text-decoration: none; font-weight: 700; font-size: 0.96rem;
          color: var(--char);
          background: #fff;
          transition: background 0.2s;
        }
        .btn-ghost:hover { background: #fafafa; }
        .btn-primary.sm, .btn-ghost.sm {
          padding: 10px 16px;
          font-size: 0.82rem;
        }

        .subscribe-float {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--char);
          color: #fff;
          text-decoration: none;
          padding: 10px 16px 10px 10px;
          border-radius: 100px;
          max-width: 300px;
          box-shadow: 0 12px 22px -12px rgba(36,28,20,0.45);
          flex: 0 0 auto;
        }
        .sf-pill {
          flex: 0 0 auto;
          background: var(--amber);
          color: var(--char);
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 5px 10px;
          border-radius: 100px;
        }
        .sf-text { font-size: 0.78rem; font-weight: 600; line-height: 1.3; }
        .sf-arrow {
          flex: 0 0 auto;
          width: 22px; height: 22px;
          background: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        @media(max-width: 640px) {
          .cta-row { flex-direction: column; align-items: flex-start; }
          .subscribe-float { max-width: 100%; }
        }
        
        .trust-row { display: flex; align-items: center; gap: 16px; }
        .avatars { display: flex; }
        .avatars span {
          width: 32px; height: 32px; border-radius: 50%;
          border: 2.5px solid var(--cream);
          margin-left: -9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem;
        }
        .avatars span:first-child { margin-left: 0; }
        .a1 { background: #F3D3B6; } .a2 { background: #D4E3D8; } .a3 { background: #F6C9C2; } 
        .a4 { background: var(--char); color: #fff; font-weight: 700; font-size: 0.7rem; }
        .trust-row small { color: var(--muted); font-weight: 600; font-size: 0.85rem; }

        /* hero visual */
        .hero-visual { position: relative; height: 460px; }
        .route-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .stop-card {
          position: absolute;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 16px 18px;
          width: 190px;
          box-shadow: 0 20px 40px -22px rgba(36, 28, 20, 0.15);
          animation: floaty 5s ease-in-out infinite;
        }
        @keyframes floaty {
          0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
          50% { transform: translateY(-6px) rotate(var(--r, 0deg)); }
        }
        .stop-card .tag {
          font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--muted); margin-bottom: 6px;
        }
        .stop-card h4 { margin: 0 0 3px; font-family: 'Fraunces', serif; font-size: 1.02rem; font-weight: 600; }
        .stop-card p { margin: 0; font-size: 0.8rem; color: var(--muted); }
        .stop-card .ico {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
          font-size: 1.1rem;
        }
        .stop1 { top: 44px; left: 0; --r: -3deg; transform: rotate(-3deg); animation-delay: 0s; }
        .stop1 .ico { background: var(--amber-soft); }
        .stop2 { top: 224px; right: 6px; --r: 2deg; transform: rotate(2deg); animation-delay: 1.2s; }
        .stop2 .ico { background: var(--palm-soft); }
        .stop3 { bottom: 6px; left: 24px; --r: -1.5deg; transform: rotate(-1.5deg); animation-delay: 2.4s; }
        .stop3 .ico { background: #FBDCC0; }
        .tape {
          position: absolute; width: 64px; height: 22px;
          background: rgba(227, 168, 87, 0.45);
          top: -10px; left: 20px;
          transform: rotate(-8deg);
          border-radius: 2px;
        }
        .rating-badge {
          position: absolute;
          top: 0; right: 0;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 12px 22px -14px rgba(36,28,20,0.25);
          z-index: 2;
        }
        .rating-badge .stars { font-weight: 800; font-size: 0.9rem; }
        .rating-badge .rated-by { font-size: 0.68rem; color: var(--muted); font-weight: 600; margin-top: 2px; }
        @media(max-width: 900px){
           .hero { grid-template-columns: 1fr; gap: 40px; padding: 30px 0 60px; }
           .hero-visual { height: 380px; transform: scale(0.85); transform-origin: left top; }
        }

        /* ---------------- 3D PACKAGED MEALS SECTION ---------------- */
        .meals-3d-showcase { 
          background: #FCFBF9; 
          border-top: 1px solid var(--line); 
          padding: 80px 0;
        }
        .pouch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          perspective: 1400px; /* Crucial for the 3D effect */
        }
        .pouch-card {
          height: 400px;
          background: transparent;
          cursor: pointer;
        }
        .pouch-3d-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-style: preserve-3d;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(36, 28, 20, 0.15), 0 0 0 1px inset rgba(255,255,255,0.2);
        }
        .pouch-card:hover .pouch-3d-wrap {
          transform: translateY(-15px) rotateX(8deg) rotateY(-6deg) scale(1.03);
          box-shadow: 0 40px 60px -15px rgba(36, 28, 20, 0.25), 0 0 0 1px inset rgba(255,255,255,0.4);
        }
        /* Specific rotations to make the packages look dynamic */
        .pouch-card:hover .zobo-wrap { transform: translateY(-15px) rotateX(10deg) rotateY(4deg) scale(1.03); }
        .pouch-card:hover .ginger-wrap { transform: translateY(-15px) rotateX(12deg) rotateY(-8deg) scale(1.03); }

        .pouch-front {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 24px;
          padding: 34px 28px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          color: #fff;
          overflow: hidden;
        }
        /* Lighting Glare / Shine Effect to simulate a real package */
        .pouch-front::after {
          content: '';
          position: absolute;
          top: 0; left: -150%;
          width: 50%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-25deg);
          transition: left 0.7s ease-in-out;
        }
        .pouch-card:hover .pouch-front::after {
          left: 200%;
        }
        
        .native-bg {
          background-color: var(--clay-dark);
          background-image: linear-gradient(to top, rgba(26, 12, 0, 0.9) 0%, rgba(26, 12, 0, 0) 80%);
        }
        .zobo-bg {
          background-color: #8A1C3B;
          background-image: linear-gradient(to top, rgba(30, 0, 10, 0.9) 0%, rgba(30, 0, 10, 0) 80%);
        }
        .ginger-bg {
          background-color: var(--amber);
          background-image: linear-gradient(to top, rgba(40, 25, 0, 0.9) 0%, rgba(40, 25, 0, 0) 80%);
        }
        
        .pouch-label {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
          padding: 8px 14px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          align-self: flex-start;
          margin-bottom: auto; /* Pushes content to the bottom */
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .pouch-front h3 {
          font-family: 'Fraunces', serif;
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0 0 10px;
          line-height: 1.1;
          letter-spacing: -0.01em;
        }
        .pouch-front p {
          font-size: 0.95rem;
          margin: 0;
          opacity: 0.9;
          line-height: 1.5;
          font-weight: 500;
        }

        /* ---------------- SECTION SHELL ---------------- */
        section { padding: 70px 0; }
        .sec-head { max-width: 600px; margin-bottom: 48px; }
        .sec-eyebrow {
          font-family: 'Caveat', cursive;
          font-size: 1.4rem;
          color: var(--clay);
          font-weight: 700;
          margin: 0 0 2px;
        }
        .sec-head h2 {
          font-size: clamp(1.9rem, 3vw, 2.6rem);
          margin: 0;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        /* ---------------- HOW IT WORKS ---------------- */
        .how { background: #FFFFFF; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .steps {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 0;
          position: relative;
        }
        .step { padding: 0 26px; position: relative; }
        .step:not(:last-child)::after {
          content: ''; position: absolute; top: 26px; right: -14px;
          width: 0; height: 0;
          border-top: 7px solid transparent; border-bottom: 7px solid transparent;
          border-left: 10px solid var(--line);
        }
        .step-num {
          font-family: 'Fraunces', serif;
          font-size: 0.85rem; font-weight: 700;
          color: var(--clay);
          margin-bottom: 14px;
        }
        .step-ico {
          width: 52px; height: 52px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; margin-bottom: 18px;
        }
        .step:nth-child(1) .step-ico { background: var(--amber-soft); }
        .step:nth-child(2) .step-ico { background: var(--palm-soft); }
        .step:nth-child(3) .step-ico { background: #FBDCC0; }
        .step h3 { font-family: 'Fraunces', serif; font-size: 1.28rem; font-weight: 600; margin: 0 0 10px; }
        .step p { margin: 0; color: #5c5040; font-size: 0.94rem; line-height: 1.55; }
        @media(max-width: 820px) {
          .steps { grid-template-columns: 1fr; gap: 40px; }
          .step:not(:last-child)::after { display: none; }
        }

        /* ---------------- SELLERS ---------------- */
        .sellers { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 60px; align-items: start; }
        .seller-copy p.lede { font-size: 1.05rem; line-height: 1.65; color: #4a4033; margin-bottom: 26px; }
        .stat-row { display: flex; gap: 34px; margin-top: 8px; }
        .stat b { display: block; font-family: 'Fraunces', serif; font-size: 2rem; color: var(--clay-dark); }
        .stat span { font-size: 0.82rem; color: var(--muted); font-weight: 600; }

        .recipe-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .recipe-card {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .recipe-card:nth-child(2) { transform: translateY(18px); }
        .recipe-card:nth-child(3) { transform: translateY(-6px); }
        .recipe-card:nth-child(4) { transform: translateY(10px); }
        .recipe-card .pin {
          position: absolute; top: -9px; left: 16px;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--clay);
          box-shadow: 0 3px 6px rgba(255,122,46,0.3);
        }
        .recipe-card h4 { font-family: 'Fraunces', serif; font-size: 1.02rem; font-weight: 600; margin: 6px 0 8px; }
        .recipe-card p { margin: 0; font-size: 0.85rem; color: var(--muted); line-height: 1.5; }
        @media(max-width: 900px) {
          .sellers { grid-template-columns: 1fr; }
          .recipe-card:nth-child(n) { transform: none; }
        }

        /* ---------------- TESTIMONIAL ---------------- */
        .testimonial { display: flex; align-items: center; gap: 54px; }
        .stamp {
          flex: 0 0 auto;
          width: 150px; height: 150px; border-radius: 50%;
          border: 2px dashed var(--palm);
          display: flex; align-items: center; justify-content: center;
          transform: rotate(-8deg);
        }
        .stamp-inner {
          width: 120px; height: 120px; border-radius: 50%;
          border: 1px solid var(--palm);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: var(--palm); text-align: center;
        }
        .stamp-inner b { font-family: 'Fraunces', serif; font-size: 0.78rem; letter-spacing: 0.03em; line-height: 1.2; }
        .stamp-inner span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; margin-top: 4px; }
        .quote p {
          font-family: 'Fraunces', serif;
          font-size: 1.55rem;
          font-weight: 500;
          line-height: 1.45;
          margin: 0 0 18px;
          letter-spacing: -0.01em;
        }
        .quote cite { font-style: normal; font-weight: 700; font-size: 0.92rem; display: block; }
        .quote cite span { display: block; font-weight: 500; color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
        @media(max-width: 760px) { .testimonial { flex-direction: column; text-align: center; gap: 26px; } }

        /* ---------------- FINAL CTA ---------------- */
        .final { text-align: center; padding: 90px 0 70px; }
        .final h2 {
          font-size: clamp(2rem, 4vw, 3rem);
          max-width: 640px; margin: 0 auto 26px;
          font-weight: 600;
        }
        .final .btn-primary { padding: 17px 34px; font-size: 1.02rem; }

        footer {
          border-top: 1px solid var(--line);
          padding: 34px 0;
          display: flex; align-items: center; justify-content: space-between;
          color: var(--muted); font-size: 0.85rem;
        }
        footer .flinks { display: flex; gap: 22px; }
        footer a { text-decoration: none; color: var(--muted); }
        @media(max-width: 600px) { footer { flex-direction: column; gap: 12px; text-align: center; } }
      `}</style>
    </>
  );
}
