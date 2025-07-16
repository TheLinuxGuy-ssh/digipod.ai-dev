import '../style.css';
import '../locomotive.css';
import Image from 'next/image';
// import Link from 'next/link';

export default function Home() {
    return (
    <div id="master">
      <nav className="navbar">
        <Image src="/digipod.png" alt="nav-logo" className="nav-logo" width={200} height={60} />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
          <a href="/signin" className="btn" style={{ padding: '8px 20px', fontWeight: 600, fontSize: '1rem', background: 'rgba(133,80,255,0.15)', borderRadius: '20px', border: '1px solid rgba(149,120,255,0.2)', color: '#fff', marginRight: '0.5rem', textDecoration: 'none' }}>Sign In</a>
          <a href="/signup" className="btn" style={{ padding: '8px 20px', fontWeight: 600, fontSize: '1rem', background: 'rgba(133,80,255,0.35)', borderRadius: '20px', border: '1px solid rgba(149,120,255,0.3)', color: '#fff', marginRight: '0.5rem', textDecoration: 'none' }}>Sign Up</a>
        </div>
      </nav>
      <div className="content" data-scroll-section data-scroll-speed="1">
        <div className="quote-container">
          <div className="caption">Your Anti-Productivity Tool</div>
          <div className="quote" data-scroll data-scroll-speed="-1"><span data-scroll data-scroll-repeat data-scroll-speed="5" data-scroll-delay="0.3" data-scroll-position="top">A</span>I-Powered<br />Back Office</div>
          <div className="author">Digipod is the first anti-producitvity tool for creatives. <br /> We dont help hustle - we help you stop. Automate emails, invoices, updates, client chaos so you can finally get back to your craft.</div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://forms.gle/2j3DcMv9HyxzeDqi8" target="_blank" className="btn"><span>Join Waitlist &#8594;</span></a>
            <a
              href="https://rzp.io/rzp/HFCaYsw"
              target="_blank"
              className="btn cta-button"
              style={{ background: '#FFD600', color: '#23243a', fontWeight: 700, opacity: 0.88 }}
            >
              <span>Unlock Founders deal</span>
            </a>
          </div>
        </div>
      </div>
      <div className="custom-cursor"></div>
      <div id="container" data-scroll-section="">
        <canvas id="canvas"></canvas>
        <div className="a-hole">
          <canvas className="js-canvas"></canvas>
          <div className="aura"></div>
          <div className="overlay"></div>
        </div>
        <div id="controls" style={{ display: 'none' }}>
          <button id="playButton">PLAY</button>
        </div>
        <div id="fps" style={{ display: 'none' }}>FPS: 0</div>
      </div>
      <section className="section-resource" data-scroll-section="">
        <Image className="showcase-img" src="/highlight.png" style={{ zIndex: 1000000 }} width={800} height={400} alt="" />
      </section>
      <section className="features" data-scroll-section="">
        <div className="card card-before">
          <div className="header">
            <div className="header-row">
              <div className="header-col">
                <span className="price">Before DigiPod</span>
                <ul className="lists">
                  <li className="list"><svg width="50" height="50" fill="#ff0000"><circle cx="25" cy="25" r="23" /></svg><span>You spent 4 hours a day searching and replying to emails that could have been one sentence</span></li>
                  <li className="list"><svg width="50" height="50" fill="#ff0000"><circle cx="25" cy="25" r="23" /></svg><span>Projects move forward only when you manually nudge them, remind clients and update timelines.</span></li>
                  <li className="list"><svg width="50" height="50" fill="#ff0000"><circle cx="25" cy="25" r="23" /></svg><span>Clients derail your flow with randoms requests, scope creep, and 17 follow ups.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-after">
          <div className="header-col">
            <span className="price">After DigiPod</span>
            <ul className="lists">
              <li className="list"><svg width="20" height="20" fill="#fff"><circle cx="10" cy="10" r="8" /></svg><span>AI handles 90% of the client emails while you sip coffee and design in peace.</span></li>
              <li className="list"><svg width="20" height="20" fill="#fff"><circle cx="10" cy="10" r="8" /></svg><span>DigiPod auto-advances projects based on smart email parsing and intent protection.</span></li>
              <li className="list"><svg width="20" height="20" fill="#fff"><circle cx="10" cy="10" r="8" /></svg><span>Clients are onboarded, well communicated and filtered automatically - no interruptions, no nonsense.</span></li>
            </ul>
          </div>
        </div>
      </section>
      <section className="extras-section" data-scroll-section="">
        <div className="feature-card">
          <div className="mist"></div>
          <div className="tilt">
            <div className="feature-content">
              <span className="tag">01</span>
              <h2>AI powered <br />Client Inbox</h2>
              <p>Your chaotic inbox, reimagined. <br />Lets AI triage, respond and organise client comms so you never miss a beat.</p>
            </div>
            <div className="card-img">
              <Image src="/inbox.png" alt="" width={200} height={120} />
            </div>
          </div>
        </div>
        <div className="feature-card">
          <div className="mist"></div>
          <div className="tilt">
            <div className="card-img">
              <Image src="/progression.png" alt="" width={200} height={120} />
            </div>
            <div className="feature-content">
              <span className="tag">02</span>
              <h2>Automatic Phase Detection & <br />Progression</h2>
              <p>No more manually updating project statuses. <span>Digipod tracks progress and nudges</span>. phases forward - automatically. </p>
            </div>
          </div>
        </div>
        <div className="feature-card">
          <div className="mist"></div>
          <div className="tilt">
            <div className="feature-content">
              <span className="tag">03</span>
              <h2>Intelligence that gets Smarter with every task it handles</h2>
              <p>Our AI learns from every project, client message and edge case. <span>Fewer Fumbles.</span>. Sharper Suggestions. Always levelling up. </p>
            </div>
            <div className="card-img">
              <Image src="/AI.png" alt="" width={200} height={120} />
            </div>
          </div>
        </div>
        <div className="feature-card">
          <div className="mist"></div>
          <div className="tilt">
            <div className="card-img">
              <Image src="/marathon.png" alt="" width={200} height={120} />
            </div>
            <div className="feature-content">
              <span className="tag">04</span>
              <h2>No more scope <br />Marathons</h2>
              <p>Detect scope creep before it becomes a crisis. <span>Digipod sets, defends</span> and enforces boundaries - without the awkward convos.</p>
            </div>
          </div>
        </div>
        <div className="feature-card">
          <div className="mist"></div>
          <div className="tilt">
            <div className="feature-content">
              <span className="tag">05</span>
              <h2>Built to integrate, <br />Not isolate </h2>
              <p>Digipod plugs into your existing workflows -<span>from Gmail to Notion to Slack.</span> No rip and replace required.</p>
            </div>
            <div className="card-img">
              <Image src="/mail.png" alt="" width={200} height={120} />
            </div>
          </div>
        </div>
      </section>
      <section className="pricing" data-scroll-section>
        <h1 className="pricing-title"><span className="pricing-title-main">Be one of the first 100</span><br />to own the AI Back Office for your creative work</h1>
        <div className="card-container" id="cardContainer">
          <div className="card-pricing">
            <h2 className="card-title">Early Access</h2>
            <p className="card-price">
              <span className="currency">INR</span>400<span className="text-3xl align-baseline"></span>
              <span className="period">INR 3500</span>
            </p>
            <ul className="features-list">
              <li><svg className="rotating-disc-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" /></svg>Get Early Access + 3 Months Free</li>
              <li><svg className="rotating-disc-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" /></svg>Lifetime Discount Post Launch</li>
              <li><svg className="rotating-disc-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" /></svg>Your features requrests get top priority</li>
            </ul>
            <a href="https://rzp.io/rzp/eccVpVH" target="_blank" className="cta-button">Pre-order Now</a>
          </div>
        </div>
      </section>
      <footer className="footer" data-scroll-section="">
        <div className="footer-background"></div>
        <a href="https://forms.gle/2j3DcMv9HyxzeDqi8" target="_blank" className="btn" data-scroll="" data-scroll-speed="1.5" data-scroll-delay="0.5"><span>Get Early Access &#8594;</span></a>
        <div id="spiral"></div>
        <div className="footer-bottom">
          <a href="/privacy-policy.html" className="footer-link" target="_blank">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
} 