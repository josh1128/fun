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
if "said_yes" not in st.session_state:
    st.session_state.said_yes = False
if "no_count" not in st.session_state:
    st.session_state.no_count = 0
 
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
 
# ---------- UI ----------
if st.session_state.said_yes:
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