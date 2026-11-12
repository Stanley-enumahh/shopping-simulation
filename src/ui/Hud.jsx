import { useEffect, useRef, useState } from 'react';
import { PRODUCTS, fmt } from '../data/products';
import { getState, setSettings, setState, useStore } from '../store';
import {
  addToCart, coarsePointer, emptyCart, exitLock, goPay, putBack, removeOne,
  setJoy, startGame, toggleCart, toggleMute, world, enableTouch,
} from '../game/world';
import { cancelCheckout, leaveTill, payByCard, payByTransfer, sentTransfer, startCheckout, tapCard } from '../game/checkout';
import { sfx } from '../game/audio';
import { makeFlyer } from './flyer';

const total = (cart) => cart.reduce((s, e) => s + PRODUCTS[e.ti].price, 0);
function groupCart(list) {
  const m = new Map();
  for (const ti of list) m.set(ti, (m.get(ti) || 0) + 1);
  return [...m];
}
const items = (n) => (n === 1 ? '1 item' : n + ' items');

function Leaf() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" fill="#fff" />
      <path d="M5 19 13 11" stroke="#1f7a55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TopBar() {
  const aisle = useStore((s) => s.aisle);
  const cart = useStore((s) => s.cart);
  const muted = useStore((s) => s.muted);
  const open = useStore((s) => s.cartOpen);
  const bump = useStore((s) => s.cartBump);
  const btn = useRef();
  useEffect(() => { world.cartBtnEl = btn.current; }, []);
  useEffect(() => {
    if (!bump) return;
    const el = btn.current;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }, [bump]);
  return (
    <header className="top">
      <div className="chip where">
        <span className="logo"><Leaf /></span>
        <div><b>Eko Fresh Mart</b><span>{aisle}</span></div>
      </div>
      <div className="right">
        <button className="iconbtn" onClick={(e) => { e.currentTarget.blur(); sfx.click(); setState({ settingsOpen: true, cartOpen: false }); }} aria-label="Settings" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c2621" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
        <button className="iconbtn" onClick={(e) => { e.currentTarget.blur(); toggleMute(); }} aria-label={muted ? 'Turn sound on' : 'Mute sound'} title="Sound (M)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c2621" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" />
            {muted ? <path d="m17 9 5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
          </svg>
        </button>
        <button ref={btn} className="cartbtn" aria-label={`Open basket, ${items(cart.length)}`} aria-expanded={open} title="Basket (C)"
          onClick={(e) => { e.currentTarget.blur(); sfx.init(); sfx.click(); toggleCart(); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1c2621" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4h2.2l2.3 11h10.8l2.2-8H7" /><circle cx="9.5" cy="19.5" r="1.4" /><circle cx="17" cy="19.5" r="1.4" />
          </svg>
          <span className={'count' + (cart.length ? '' : ' zero')}>{cart.length}</span>
        </button>
      </div>
    </header>
  );
}

function CartPanel() {
  const open = useStore((s) => s.cartOpen);
  const cart = useStore((s) => s.cart);
  if (!open) return null;
  const rows = groupCart(cart.map((e) => e.ti));
  return (
    <aside className="cartpanel" aria-label="Your basket">
      <header><h2>Your basket</h2><span>{items(cart.length)}</span></header>
      {rows.length ? (
        <ul>
          {rows.map(([ti, n]) => {
            const p = PRODUCTS[ti];
            return (
              <li key={ti}>
                <span className="sw" style={{ background: `linear-gradient(180deg, ${p.c1} 70%, ${p.c2} 70%)` }} />
                <div className="nm"><small>{p.brand}</small><b>{p.line}</b><span className="q">{n} × {fmt(p.price)}</span></div>
                <span className="lt">{fmt(n * p.price)}</span>
                <button className="rm" onClick={() => removeOne(ti)} aria-label={'Put back one ' + p.line} title="Put one back">−</button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">Nothing here yet. Walk up to a shelf, pick something up and choose <b>Add to basket</b>.</p>
      )}
      <footer>
        <div className="sumrow"><span>Total</span><b>{fmt(total(cart))}</b></div>
        <div className="btnrow">
          <button className="btn ghost" disabled={!cart.length} onClick={emptyCart}>Empty basket</button>
          <button className="btn primary" disabled={!cart.length} onClick={goPay}>Pay at the till</button>
        </div>
      </footer>
    </aside>
  );
}

function HoverTag() {
  const hover = useStore((s) => s.hover);
  const touch = useStore((s) => s.touchUI);
  const ref = useRef();
  useEffect(() => { world.hoverTagEl = ref.current; }, []);
  const p = hover == null ? null : PRODUCTS[hover];
  return (
    <div ref={ref} className="hovertag" hidden={!p}>
      {p && (<><b>{p.brand} {p.line}</b><div className="row"><span className="price">{fmt(p.price)}</span><small>{touch ? 'Tap to pick up' : 'Click to pick up'}</small></div></>)}
    </div>
  );
}

function Hints() {
  const phase = useStore((s) => s.phase);
  const locked = useStore((s) => s.locked);
  const touch = useStore((s) => s.touchUI);
  const refused = useStore((s) => s.lockRefused);
  const cartOpen = useStore((s) => s.cartOpen);
  const receipt = useStore((s) => s.receipt);
  const hover = useStore((s) => s.hover);
  const prompt = useStore((s) => s.prompt);
  const settingsOpen = useStore((s) => s.settingsOpen || !!s.flyer);
  if (phase === 'loading' || phase === 'intro' || phase === 'checkout') return null;
  const busy = phase === 'inspect' || phase === 'picking';
  return (
    <>
      {locked && <div className={'reticle' + (hover != null ? ' on' : '')} />}
      {!touch && !locked && phase === 'walk' && !cartOpen && !receipt && !settingsOpen && !prompt && (
        <div className="lookhint">{refused ? 'Drag to look around' : 'Click to look around'}</div>
      )}
      {prompt && phase === 'walk' && (
        prompt === 'tap-pay'
          ? <button className="prompt act" onClick={startCheckout}>Pay at the till</button>
          : <div className="prompt">{prompt}</div>
      )}
      {!busy && !prompt && (
        <div className="hint">
          {touch
            ? (<><b>Left thumb</b> to walk · <b>drag</b> to look · <b>tap</b> a product</>)
            : (<><b>WASD</b> to walk · <b>mouse</b> to look · <b>click</b> a product · <b>Shift</b> to hurry · <b>C</b> basket</>)}
        </div>
      )}
    </>
  );
}

function InspectCard() {
  const id = useStore((s) => s.inspecting);
  const cart = useStore((s) => s.cart);
  const touch = useStore((s) => s.touchUI);
  const dragHint = useStore((s) => s.dragHint);
  useEffect(() => {
    if (id == null || !touch) return undefined;
    let seen = false;
    try { seen = localStorage.getItem('ekofresh.dragHint') === '1'; } catch (e) { /* optional */ }
    if (seen) return undefined;
    setState({ dragHint: true });
    const t = setTimeout(() => { setState({ dragHint: false }); try { localStorage.setItem('ekofresh.dragHint', '1'); } catch (e) { /* optional */ } }, 2800);
    return () => clearTimeout(t);
  }, [id, touch]);
  if (id == null) return null;
  const p = PRODUCTS[id], n = cart.filter((e) => e.ti === id).length;
  return (
    <>
      {dragHint && <div className="draghint" aria-hidden="true"><span className="finger" /><b>Drag to turn it over</b></div>}
      <section className="inspect" aria-live="polite">
        <p className="eyebrow">{p.fridge != null ? 'Fridge' : p.endcap ? 'Front stand' : 'Aisle ' + p.face.aisle} · {p.face.cat}</p>
        {p.promo && <p className="promoline">Promo! Was <s>{fmt(p.promo.was)}</s>, now {fmt(p.price)}</p>}
        <h2><small>{p.brand}</small>{p.line}</h2>
        <p className="desc">{p.desc}</p>
        <div className="pricerow">
          <div className="shelftag"><b>{fmt(p.price)}</b><span>{p.unit}</span></div>
          <span className="meta">{p.size}</span>
          {n > 0 && <span className="incart">{n} in your basket</span>}
        </div>
        <div className="btnrow">
          <button className="btn ghost" onClick={(e) => { e.currentTarget.blur(); putBack(); }}>Put back<kbd>Q</kbd></button>
          <button className="btn primary" onClick={(e) => { e.currentTarget.blur(); addToCart(); }}>Add to basket<kbd>E</kbd></button>
        </div>
        <p className="drag">{touch ? 'Drag to turn it over' : 'Drag to turn it over · scroll to bring it closer'}</p>
      </section>
    </>
  );
}

/** The till screen while you pay: items as they scan, then card or transfer. */
function TillPanel() {
  const till = useStore((s) => s.till);
  const listRef = useRef();
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [till && till.lines.length]);
  if (!till) return null;
  const rows = groupCart(till.lines);
  return (
    <aside className="tillpanel" aria-live="polite">
      <header><h2>Till 2</h2><span>Cashier: Bisi</span></header>
      <ul ref={listRef}>
        {rows.map(([ti, n]) => (
          <li key={ti}><span>{(n > 1 ? n + ' × ' : '') + PRODUCTS[ti].line}</span><b>{fmt(n * PRODUCTS[ti].price)}</b></li>
        ))}
        {till.stage === 'scanning' && <li className="scanning"><span>Scanning…</span><i className="dots" /></li>}
      </ul>
      <div className="sumrow"><span>Total</span><b>{fmt(till.total)}</b></div>
      {till.stage === 'pay' && (
        <div className="paywith">
          <p>How would you like to pay?</p>
          <div className="btnrow">
            <button className="btn ghost" onClick={payByCard}>Card</button>
            <button className="btn primary" onClick={payByTransfer}>Transfer</button>
          </div>
          <button className="linkbtn" onClick={cancelCheckout}>Cancel and keep shopping</button>
        </div>
      )}
      {till.stage === 'card' && (
        <div className="paywith">
          <p>Tap or insert your card on the terminal.</p>
          <button className="btn primary wide" onClick={tapCard}>Tap card</button>
        </div>
      )}
      {till.stage === 'processing' && <div className="status"><i className="spinner" />Processing card…</div>}
      {till.stage === 'transfer' && (
        <div className="paywith">
          <div className="account">
            <small>Transfer exactly</small><b>{fmt(till.total)}</b>
            <small>to</small><span>Enumah Stanley Oluebube</span>
            <span className="acct">8130127556 · Opay</span>
          </div>
          <button className="btn primary wide" onClick={sentTransfer}>I have sent it</button>
          <p className="gamenote">This is a game: the payment is pretend, so you don’t need to send real money.</p>
        </div>
      )}
      {till.stage === 'pending' && <div className="status"><i className="spinner" />Transfer pending… waiting for the alert</div>}
      {till.stage === 'approved' && <div className="status ok">✓ Payment received</div>}
    </aside>
  );
}

function Subtitle() {
  const sub = useStore((s) => s.subtitle);
  if (!sub) return null;
  return <div className="subtitle" key={sub.id}><b>{sub.who}</b>{sub.text}</div>;
}

function Joystick() {
  const touch = useStore((s) => s.touchUI);
  const phase = useStore((s) => s.phase);
  const receipt = useStore((s) => s.receipt);
  const [run, setRun] = useState(false);
  const base = useRef(), knob = useRef(), id = useRef(null);
  if (!touch || !(phase === 'walk' || phase === 'returning') || receipt) return null;
  const move = (e) => {
    const r = base.current.getBoundingClientRect(), R = r.width * 0.37;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    setJoy(dx / R, dy / R);
  };
  const end = (e) => {
    if (e.pointerId !== id.current) return;
    id.current = null; setJoy(0, 0); knob.current.style.transform = '';
  };
  return (
    <>
      <div ref={base} className="joy" aria-hidden="true"
        onPointerDown={(e) => { e.preventDefault(); enableTouch(); id.current = e.pointerId; try { base.current.setPointerCapture(e.pointerId); } catch (err) { /* optional */ } move(e); }}
        onPointerMove={(e) => { if (e.pointerId === id.current) move(e); }}
        onPointerUp={end} onPointerCancel={end}>
        <div ref={knob} className="knob" />
      </div>
      <button className={'runbtn' + (run ? ' on' : '')} aria-pressed={run}
        onClick={() => { const v = !run; setRun(v); world.keys.run = v; sfx.click(); }}>
        {run ? 'Walking fast' : 'Walk fast'}
      </button>
    </>
  );
}

function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen);
  const st = useStore((s) => s.settings);
  const [track, setTrack] = useState(null);
  const fileRef = useRef();
  useEffect(() => { sfx.setVolumes(st.sfx, st.music); }, [st.sfx, st.music]);
  if (!open) return null;
  const close = () => { sfx.click(); setState({ settingsOpen: false }); };
  const slider = (key, label, min, max, step, show) => (
    <label className="setrow">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={st[key]} id={'set-' + key}
        onChange={(e) => setSettings({ [key]: parseFloat(e.target.value) })} />
      <output>{show(st[key])}</output>
    </label>
  );
  return (
    <div className="modal" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="settings" role="dialog" aria-labelledby="setTitle">
        <header><h2 id="setTitle">Settings</h2><button className="iconbtn small" onClick={close} aria-label="Close settings">✕</button></header>
        <section>
          <h3>Camera</h3>
          <div className="seg" role="radiogroup" aria-label="Camera view">
            {[['first', 'First person'], ['third', 'Third person']].map(([v, l]) => (
              <button key={v} role="radio" aria-checked={st.view === v} className={st.view === v ? 'on' : ''} onClick={() => setSettings({ view: v })}>{l}</button>
            ))}
          </div>
          {slider('sensitivity', 'Look sensitivity', 0.4, 2, 0.05, (v) => v.toFixed(2) + '×')}
          {slider('fov', 'Field of view', 55, 95, 1, (v) => v + '°')}
        </section>
        <section>
          <h3>Sound</h3>
          {slider('sfx', 'Effects', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}
          {slider('music', 'Music', 0, 1, 0.05, (v) => Math.round(v * 100) + '%')}
          <label className="setrow check">
            <span>Spoken voices (guard, cashier, announcements)</span>
            <input type="checkbox" id="set-voices" checked={st.voices} onChange={(e) => setSettings({ voices: e.target.checked })} />
          </label>
        </section>
        <section>
          <h3>Store music</h3>
          <p className="note">The store plays its own Afrobeats-style groove. To hear your own music, pick a song file from your device. It plays through the store speakers and is never uploaded.</p>
          <input ref={fileRef} type="file" accept="audio/*" id="set-music-file" hidden
            onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f && sfx.playCustom(f)) setTrack(f.name); e.target.value = ''; }} />
          <div className="btnrow">
            <button className="btn ghost" onClick={() => fileRef.current.click()}>Play your own music</button>
            {track && <button className="btn ghost" onClick={() => { sfx.stopCustom(); setTrack(null); }}>Back to store music</button>}
          </div>
          {track && <p className="note now">Now playing: {track}</p>}
        </section>
      </div>
    </div>
  );
}

function Intro() {
  const phase = useStore((s) => s.phase);
  if (phase !== 'loading' && phase !== 'intro') return null;
  const rows = coarsePointer
    ? [['Joystick', 'Walk with your left thumb'], ['Drag', 'Look around'], ['Tap', 'Pick up a product'], ['Till', 'Pay at the front, by the door']]
    : [['W A S D', 'Walk (arrow keys work too)'], ['Mouse', 'Look around'], ['Click', 'Pick up a product'], ['E / Q', 'Add to basket / put back'], ['E at till', 'Pay by card or transfer']];
  return (
    <div className="modal">
      <div className="introcard" role="dialog" aria-labelledby="introTitle">
        <h1 id="introTitle">Eko Fresh Mart</h1>
        <p>Your neighbourhood supermarket in Lekki. Walk the aisles, pick something off the shelf, drop it in your basket, then pay at the till.</p>
        <dl className="controls">{rows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <button className="btn primary big" disabled={phase !== 'intro'} onClick={startGame}>
          {phase === 'intro' ? 'Start shopping' : 'Stocking shelves…'}
        </button>
        <p className="note">Prices in Naira. Sound and voices are generated live in your browser.</p>
      </div>
    </div>
  );
}

function Receipt() {
  const r = useStore((s) => s.receipt);
  const done = useRef();
  useEffect(() => { if (r && done.current) done.current.focus(); }, [r]);
  if (!r) return null;
  return (
    <div className="modal">
      <div className="paper" role="dialog" aria-labelledby="rcTitle">
        <h2 id="rcTitle">Eko Fresh Mart</h2>
        <p className="addr">Plot 14, Admiralty Way, Lekki · Open daily 8am to 10pm</p>
        <p className="date">{r.date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · Till 2 · {r.cashier}</p>
        <ul>
          {groupCart(r.cart.map((e) => e.ti)).map(([ti, n]) => (
            <li key={ti}><span>{(n > 1 ? n + ' × ' : '') + PRODUCTS[ti].line}</span><span>{fmt(n * PRODUCTS[ti].price)}</span></li>
          ))}
        </ul>
        <div className="rctotal"><span>{items(r.cart.length)}</span><b>{fmt(total(r.cart))}</b></div>
        <p className="date">Paid by {r.method}</p>
        <div className="barcode" aria-hidden="true" />
        <p className="thanks">Thanks for shopping with us!</p>
        <button ref={done} className="btn primary" onClick={takeBags}>Take my bags</button>
      </div>
    </div>
  );
}

/** Leave the till, then offer a shareable picture of what you bought. */
async function takeBags() {
  const r = getState().receipt;
  let flyer = null;
  try { if (r) flyer = await makeFlyer(r); } catch (e) { flyer = null; }
  leaveTill();
  if (flyer) { exitLock(); setState({ flyer }); }
}

function FlyerModal() {
  const f = useStore((s) => s.flyer);
  if (!f) return null;
  const message = `${f.text} ${f.link}`.trim();
  const file = typeof File === 'function' ? new File([f.blob], 'eko-fresh-mart-basket.png', { type: 'image/png' }) : null;
  const canShareFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  const close = () => { sfx.click(); URL.revokeObjectURL(f.url); setState({ flyer: null }); };
  const share = async () => {
    try { await navigator.share({ files: [file], title: 'My Eko Fresh Mart basket', text: message }); } catch (e) { /* cancelled */ }
  };
  return (
    <div className="modal">
      <div className="flyer" role="dialog" aria-labelledby="flyTitle">
        <h2 id="flyTitle">Share your basket</h2>
        <img src={f.url} alt="Flyer showing the items you bought at Eko Fresh Mart and your total" />
        <div className="sharegrid">
          {canShareFile && <button className="btn primary span2" onClick={share}>Share picture…</button>}
          <a className="btn wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="btn x" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(f.text)}${f.link ? '&url=' + encodeURIComponent(f.link) : ''}`} target="_blank" rel="noopener noreferrer">Post on X</a>
          <a className="btn ghost" href={f.url} download="eko-fresh-mart-basket.png">Save image</a>
          <button className="btn ghost" onClick={close}>Done</button>
        </div>
        <p>{canShareFile
          ? 'Share picture sends the image straight to WhatsApp, X or any app on your phone.'
          : 'The WhatsApp and X buttons share a message with the link. To post the picture as well, save it and attach it.'}</p>
      </div>
    </div>
  );
}

function Toast() {
  const msg = useStore((s) => s.toast);
  return <div className={'toast' + (msg ? ' on' : '')} role="status">{msg}</div>;
}

export default function Hud() {
  const inspecting = useStore((s) => s.inspecting);
  const touch = useStore((s) => s.touchUI);
  useEffect(() => { document.body.classList.toggle('touch', touch); }, [touch]);
  return (
    <>
      <div className={'vignette' + (inspecting != null ? ' on' : '')} />
      <HoverTag />
      <Hints />
      <Subtitle />
      <TopBar />
      <CartPanel />
      <InspectCard />
      <TillPanel />
      <Joystick />
      <Intro />
      <SettingsPanel />
      <Receipt />
      <FlyerModal />
      <Toast />
    </>
  );
}
