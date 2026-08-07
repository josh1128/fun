import streamlit as st
import random

st.set_page_config(page_title="A Question for You 💕", page_icon="💖", layout="centered")

# ---------- Styling ----------
st.markdown(
    """
    <style>
        .stApp {
            background: linear-gradient(135deg, #ffe0ec 0%, #ffd1dc 50%, #ffc0cb 100%);
        }
        .big-question {
            text-align: center;
            font-size: 3rem;
            font-weight: 800;
            color: #d6336c;
            margin-top: 1rem;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.6);
        }
        .sub {
            text-align: center;
            font-size: 1.2rem;
            color: #a61e4d;
            margin-bottom: 1.5rem;
        }
        .win {
            text-align: center;
            font-size: 2.4rem;
            font-weight: 800;
            color: #c2255c;
            animation: pop 0.6s ease;
        }
        .teaser {
            text-align: center;
            font-size: 2rem;
            font-weight: 800;
            color: #d6336c;
            margin-top: 1rem;
        }
        .compliment {
            text-align: center;
            font-size: 1.4rem;
            font-weight: 700;
            color: #c2255c;
            margin: 1rem 0;
            animation: pop 0.5s ease;
        }
        @keyframes pop {
            0%   { transform: scale(0.4); opacity: 0; }
            70%  { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
        }
        div.stButton > button {
            border-radius: 30px;
            border: none;
            font-weight: 700;
            padding: 0.6rem 1.4rem;
            transition: transform 0.15s ease;
        }
        div.stButton > button:hover {
            transform: scale(1.05);
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------- State ----------
if "phase" not in st.session_state:
    st.session_state.phase = "explore"   # "explore" -> "question" -> question answered
if "said_yes" not in st.session_state:
    st.session_state.said_yes = False
if "no_count" not in st.session_state:
    st.session_state.no_count = 0
if "interactions" not in st.session_state:
    st.session_state.interactions = 0
if "compliment" not in st.session_state:
    st.session_state.compliment = ""

# How many interactions before the question unlocks
UNLOCK_AT = 5

# Increasingly desperate labels for the "No" button
NO_LABELS = [
    "No 😐",
    "Are you sure? 🥺",
    "Really sure?? 😟",
    "Think again! 😢",
    "Pretty please? 🥹",
    "You're breaking my heart 💔",
    "I'll be so sad 😭",
    "Last chance... 🙏",
    "No is not an option 😌",
]

COMPLIMENTS = [
    "You have a great smile 😊",
    "You're wonderfully curious 🔍",
    "You make pink look good 💕",
    "You're the best part of my day ☀️",
    "You're kind of amazing, you know that? ✨",
    "Talking to you is my favorite thing 💬",
]

def bump():
    """Count an interaction toward unlocking the question."""
    st.session_state.interactions += 1


# ---------- UI ----------

# PHASE 1: Explore — the real question stays hidden until you play around a bit
if st.session_state.phase == "explore":
    st.markdown('<div class="teaser">Hey you 👀 there might be a little something hidden here...</div>',
                unsafe_allow_html=True)
    st.markdown('<div class="sub">Play around with the page for a bit to unlock it 💌</div>',
                unsafe_allow_html=True)

    remaining = max(UNLOCK_AT - st.session_state.interactions, 0)
    st.progress(min(st.session_state.interactions / UNLOCK_AT, 1.0))
    if remaining > 0:
        st.markdown(f'<div class="sub">{remaining} more little thing(s) to try...</div>',
                    unsafe_allow_html=True)

    if st.session_state.compliment:
        st.markdown(f'<div class="compliment">{st.session_state.compliment}</div>',
                    unsafe_allow_html=True)

    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("🎈 Balloons"):
            bump()
            st.balloons()
            st.rerun()
    with c2:
        if st.button("❄️ Snow"):
            bump()
            st.snow()
            st.rerun()
    with c3:
        if st.button("💬 Compliment"):
            bump()
            st.session_state.compliment = random.choice(COMPLIMENTS)
            st.rerun()

    st.slider("How much are you enjoying this page? 💕", 0, 100, 50, key="enjoy_slider",
              on_change=bump)

    st.text_input("Type anything you like here 🌸", key="doodle", on_change=bump)

    # Unlock once they've experimented enough
    if st.session_state.interactions >= UNLOCK_AT:
        st.markdown('<div class="sub">😍 You unlocked it! Ready?</div>', unsafe_allow_html=True)
        if st.button("💖 Reveal the question 💖"):
            st.session_state.phase = "question"
            st.rerun()

# PHASE 2: Question answered with YES
elif st.session_state.said_yes:
    st.balloons()
    st.markdown('<div class="win">Yaaay!! 🎉 You just made me the happiest person alive! 💖</div>',
                unsafe_allow_html=True)
    st.markdown('<div class="sub">This calls for a celebration 🍰🌹✨</div>', unsafe_allow_html=True)
    st.image(
        "https://media.giphy.com/media/LnQjpWaON8nhr21vNW/giphy.gif",
        caption="It's official 💕",
        use_container_width=True,
    )
    if st.button("Aww, ask me again 🥰"):
        st.session_state.said_yes = False
        st.session_state.no_count = 0
        st.rerun()

# PHASE 2: The question itself
else:
    st.markdown('<div class="big-question">Will you be my girlfriend? 💌</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub">Choose wisely... one option is much easier to press 😉</div>',
                unsafe_allow_html=True)

    # The Yes button grows every time No is pressed
    yes_size = 1.0 + st.session_state.no_count * 0.35
    st.markdown(
        f"""
        <style>
        div[data-testid="column"]:nth-of-type(1) div.stButton > button {{
            background: linear-gradient(135deg, #ff5c8a, #ff8fab);
            color: white;
            font-size: {1.0 + st.session_state.no_count * 0.25:.2f}rem;
            transform: scale({min(yes_size, 2.2)});
        }}
        div[data-testid="column"]:nth-of-type(2) div.stButton > button {{
            background: #f1f3f5;
            color: #868e96;
            font-size: {max(1.0 - st.session_state.no_count * 0.08, 0.55):.2f}rem;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Yes! 💖", key="yes"):
            st.session_state.said_yes = True
            st.rerun()

    with col2:
        no_label = NO_LABELS[min(st.session_state.no_count, len(NO_LABELS) - 1)]
        if st.button(no_label, key="no"):
            st.session_state.no_count += 1
            st.rerun()

    if st.session_state.no_count >= len(NO_LABELS) - 1:
        st.markdown(
            '<div class="sub">😏 The "No" button has given up. Just press Yes 💕</div>',
            unsafe_allow_html=True,
        )
