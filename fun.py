import streamlit as st

st.set_page_config(page_title="Cat Simulator 🐱", page_icon="🐾", layout="centered")

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
            font-size: 2.2rem;
            font-weight: 800;
            color: #d6336c;
            margin-top: 0.5rem;
        }
        .scene-emoji {
            text-align: center;
            font-size: 5rem;
            margin: 0.5rem 0 -0.5rem 0;
            animation: pop 0.5s ease;
        }
        .scene-text {
            text-align: center;
            font-size: 1.15rem;
            color: #a61e4d;
            margin: 0.5rem 1rem 1rem 1rem;
        }
        .reaction {
            text-align: center;
            font-size: 1.05rem;
            font-weight: 700;
            color: #c2255c;
            background: rgba(255,255,255,0.5);
            border-radius: 18px;
            padding: 0.5rem 1rem;
            margin: 0.5rem auto 1rem auto;
            max-width: 90%;
            animation: pop 0.4s ease;
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
            width: 100%;
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
    st.session_state.phase = "name"     # name -> journey -> question -> answered
if "step" not in st.session_state:
    st.session_state.step = 0
if "happiness" not in st.session_state:
    st.session_state.happiness = 0
if "cat_name" not in st.session_state:
    st.session_state.cat_name = ""
if "last_reaction" not in st.session_state:
    st.session_state.last_reaction = ""
if "said_yes" not in st.session_state:
    st.session_state.said_yes = False
if "no_count" not in st.session_state:
    st.session_state.no_count = 0

# ---------- The journey ----------
# Each scene: emoji, title, text, and choices -> {label: cat reaction}
JOURNEY = [
    {
        "emoji": "🍽️",
        "title": "Breakfast Time!",
        "text": "{name} wakes up with a tiny, demanding meow. Someone is hungry!",
        "choices": {
            "Serve tuna 🐟":    "{name} devours the tuna and purrs like a little motor. 🐟💕",
            "Serve chicken 🍗": "{name} happily munches away, tail swishing with joy. 🍗😺",
            "Give treats 🍪":   "{name} gobbles the treats and does a happy little wiggle. 🍪✨",
        },
    },
    {
        "emoji": "🧶",
        "title": "Playtime!",
        "text": "{name} has zoomies and needs to burn some energy. What do you grab?",
        "choices": {
            "Wiggle the yarn 🧶":  "{name} pounces and tumbles into an adorable ball of chaos. 🧶😹",
            "Wave the feather 🪶": "{name} leaps sky-high after the feather. Such athletics! 🪶🐾",
            "Chase the laser 🔴":  "{name} skids across the floor chasing the little red dot. 🔴💨",
        },
    },
    {
        "emoji": "🛁",
        "title": "Pampering",
        "text": "After all that, {name} deserves a little spa treatment.",
        "choices": {
            "Gentle brushing 🪮": "{name} melts into the brush and closes their eyes. Bliss. 🪮😌",
            "Cozy blanket 🧣":    "{name} kneads the blanket and settles in like royalty. 🧣👑",
            "Chin scratches 🐾":  "{name} leans in for more scratches, purring loudly. 🐾💖",
        },
    },
    {
        "emoji": "🌳",
        "title": "Afternoon Adventure",
        "text": "The garden calls! {name} sniffs the fresh air, whiskers twitching.",
        "choices": {
            "Chase a butterfly 🦋": "{name} boings after the butterfly, missing by a mile. So proud anyway. 🦋😸",
            "Nap in a sunbeam ☀️":  "{name} sprawls in the warm sun and dozes off. Perfection. ☀️😴",
            "Watch the birds 🐦":   "{name} chatters at the birds from the windowsill. Ekekek! 🐦👀",
        },
    },
    {
        "emoji": "🌙",
        "title": "Winding Down",
        "text": "The sky turns pink. It's been a wonderful day with {name}.",
        "choices": {
            "Warm milk 🥛":       "{name} laps up the milk and yawns a big sleepy yawn. 🥛🥱",
            "Fireplace snuggle 🔥": "{name} curls into your lap by the fire. So warm. 🔥💗",
            "Bedtime story 📖":    "{name} listens with half-closed eyes, purring softly. 📖😻",
        },
    },
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


def name_of():
    return st.session_state.cat_name or "your kitten"


# ---------- UI ----------

# PHASE 0: Name your cat
if st.session_state.phase == "name":
    st.markdown('<div class="title">🐱 Cat Simulator 🐾</div>', unsafe_allow_html=True)
    st.markdown('<div class="scene-emoji">🐈</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="scene-text">A tiny kitten appears on your doorstep, blinking up at you. '
        'It seems to have chosen <b>you</b>. What will you name your new friend?</div>',
        unsafe_allow_html=True,
    )
    name = st.text_input("Name your kitten:", value="", placeholder="e.g. Mochi")
    if st.button("Begin the journey 🐾"):
        st.session_state.cat_name = name.strip() or "Mochi"
        st.session_state.phase = "journey"
        st.rerun()

# PHASE 1: The journey through the day
elif st.session_state.phase == "journey":
    scene = JOURNEY[st.session_state.step]
    total = len(JOURNEY)

    st.markdown(f'<div class="title">A Day With {name_of()} 🐾</div>', unsafe_allow_html=True)
    st.progress((st.session_state.step) / total,
                text=f"Happiness: {'💖' * st.session_state.happiness}{'🤍' * (total - st.session_state.happiness)}")

    if st.session_state.last_reaction:
        st.markdown(f'<div class="reaction">{st.session_state.last_reaction}</div>',
                    unsafe_allow_html=True)

    st.markdown(f'<div class="scene-emoji">{scene["emoji"]}</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="title">{scene["title"]}</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="scene-text">{scene["text"].format(name=name_of())}</div>',
                unsafe_allow_html=True)

    cols = st.columns(len(scene["choices"]))
    for col, (label, reaction) in zip(cols, scene["choices"].items()):
        with col:
            if st.button(label, key=f"choice_{st.session_state.step}_{label}"):
                st.session_state.happiness += 1
                st.session_state.last_reaction = reaction.format(name=name_of())
                st.session_state.step += 1
                if st.session_state.step >= total:
                    st.session_state.phase = "finale"
                st.rerun()

# PHASE 2: Finale — the cat brings a note
elif st.session_state.phase == "finale":
    st.markdown(f'<div class="reaction">{st.session_state.last_reaction}</div>',
                unsafe_allow_html=True)
    st.markdown('<div class="scene-emoji">💌</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="title">{name_of()} Has Something For You...</div>',
                unsafe_allow_html=True)
    st.markdown(
        f'<div class="scene-text">After the most perfect day, {name_of()} pads over and gently '
        'drops a tiny folded note at your feet. Whiskers twitching, they wait for you to open it.</div>',
        unsafe_allow_html=True,
    )
    if st.button("Open the note 💌"):
        st.session_state.phase = "question"
        st.rerun()

# PHASE 3: Answered YES
elif st.session_state.said_yes:
    st.balloons()
    st.markdown('<div class="win">Yaaay!! 🎉 You just made me the happiest person alive! 💖</div>',
                unsafe_allow_html=True)
    st.markdown(
        f'<div class="sub">And {name_of()} purrs in approval — it\'s official! 🥰</div>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="sub">This calls for a celebration 🍰🌹✨</div>', unsafe_allow_html=True)
    st.image(
        "https://media.giphy.com/media/LnQjpWaON8nhr21vNW/giphy.gif",
        caption="It's official 💕",
        use_container_width=True,
    )
    if st.button("Aww, start over 🥰"):
        st.session_state.phase = "name"
        st.session_state.step = 0
        st.session_state.happiness = 0
        st.session_state.cat_name = ""
        st.session_state.last_reaction = ""
        st.session_state.said_yes = False
        st.session_state.no_count = 0
        st.rerun()

# PHASE 3: The question (revealed by the note)
else:
    st.markdown('<div class="scene-emoji">😻</div>', unsafe_allow_html=True)
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
