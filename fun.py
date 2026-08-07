import streamlit as st

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
        .title {
            text-align: center;
            font-size: 2.4rem;
            font-weight: 800;
            color: #d6336c;
            margin-top: 1rem;
        }
        .cat-emoji {
            text-align: center;
            font-size: 4rem;
            margin-bottom: -0.5rem;
        }
        .cat-name {
            text-align: center;
            font-size: 1.1rem;
            font-weight: 700;
            color: #c2255c;
        }
        .cat-bio {
            text-align: center;
            font-size: 0.85rem;
            color: #a61e4d;
            min-height: 2.4rem;
        }
        .chosen {
            text-align: center;
            font-size: 1.6rem;
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
    st.session_state.phase = "choose_cat"   # "choose_cat" -> "question" -> answered
if "chosen_cat" not in st.session_state:
    st.session_state.chosen_cat = None
if "said_yes" not in st.session_state:
    st.session_state.said_yes = False
if "no_count" not in st.session_state:
    st.session_state.no_count = 0

# ---------- Cats to choose from ----------
CATS = [
    {"emoji": "😺", "name": "Mochi",    "bio": "Soft, sweet, always up for cuddles."},
    {"emoji": "😻", "name": "Luna",     "bio": "A hopeless romantic with heart eyes."},
    {"emoji": "😸", "name": "Waffles",  "bio": "Grins all day, chaos all night."},
    {"emoji": "😽", "name": "Pumpkin",  "bio": "Loves smooches and sunny windows."},
    {"emoji": "🐱", "name": "Bean",     "bio": "Tiny, curious, and very nosy."},
    {"emoji": "🐈", "name": "Biscuit",  "bio": "Classy stroller, expert napper."},
]

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

# PHASE 1: Pick a cat — the question stays hidden until a cat is chosen
if st.session_state.phase == "choose_cat":
    st.markdown('<div class="title">Pick your favorite cat 🐾</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub">Choose the one that steals your heart... something sweet is waiting 💌</div>',
                unsafe_allow_html=True)

    # Show cats in rows of 3
    for row_start in range(0, len(CATS), 3):
        cols = st.columns(3)
        for col, cat in zip(cols, CATS[row_start:row_start + 3]):
            with col:
                st.markdown(f'<div class="cat-emoji">{cat["emoji"]}</div>', unsafe_allow_html=True)
                st.markdown(f'<div class="cat-name">{cat["name"]}</div>', unsafe_allow_html=True)
                st.markdown(f'<div class="cat-bio">{cat["bio"]}</div>', unsafe_allow_html=True)
                if st.button(f"Choose {cat['name']} 💕", key=f"cat_{cat['name']}"):
                    st.session_state.chosen_cat = cat
                    st.session_state.phase = "question"
                    st.rerun()

# PHASE 2: Question answered with YES
elif st.session_state.said_yes:
    cat = st.session_state.chosen_cat
    st.balloons()
    st.markdown('<div class="win">Yaaay!! 🎉 You just made me the happiest person alive! 💖</div>',
                unsafe_allow_html=True)
    st.markdown(
        f'<div class="sub">And {cat["emoji"]} {cat["name"]} approves of us being official 🥰</div>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="sub">This calls for a celebration 🍰🌹✨</div>', unsafe_allow_html=True)
    st.image(
        "https://media.giphy.com/media/LnQjpWaON8nhr21vNW/giphy.gif",
        caption="It's official 💕",
        use_container_width=True,
    )
    if st.button("Aww, ask me again 🥰"):
        st.session_state.said_yes = False
        st.session_state.no_count = 0
        st.session_state.chosen_cat = None
        st.session_state.phase = "choose_cat"
        st.rerun()

# PHASE 2: The question itself (pops up after a cat is chosen)
else:
    cat = st.session_state.chosen_cat
    st.markdown(
        f'<div class="chosen">You picked {cat["emoji"]} {cat["name"]}! Great choice 😻</div>',
        unsafe_allow_html=True,
    )
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
