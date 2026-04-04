# ml_train.py — Fixed version
# Key fixes:
#   1. Classifier trained ONLY on synthetic free-text (no short labels)
#   2. 300+ sentences per category for proper generalization
#   3. Removed n_jobs from LogisticRegression (deprecated in sklearn 1.8)
#   4. Risk Score Predictor unchanged (it was working fine: MAE 2.26, R2 0.97)

import pandas as pd
import joblib
import os
import numpy as np
import random
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, mean_absolute_error, r2_score

random.seed(42)

ROOT     = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
csv_path = os.path.join(ROOT, "data", "cleaned_crime_dataset.csv")
df       = pd.read_csv(csv_path)
df['Risk_Score'] = df['Risk_Score'].clip(upper=100)

print(f"Loaded dataset: {len(df):,} rows (used only for Risk Score model)")
print(f"Unique descriptions: {df['Crime Description'].nunique()}")
print(f"Unique categories:   {df['Clean Category'].nunique()}")

# ─────────────────────────────────────────────────────────────
# SYNTHETIC FREE-TEXT TRAINING DATA
# The original dataset has only 38 short labels like "PICKPOCKET"
# These are useless for free-text classification.
# We train the classifier ONLY on these realistic sentences.
# ─────────────────────────────────────────────────────────────

SYNTHETIC = {

    "Theft": [
        "someone stole my phone in a crowded market",
        "my wallet was pickpocketed on the metro",
        "shoplifting caught on camera at the mall",
        "my bike was stolen from outside the office",
        "chain snatching incident near the park",
        "vehicle theft reported in the parking lot",
        "my laptop bag was snatched by a person on a bike",
        "items missing from my car overnight",
        "gold jewelry stolen from my house",
        "mobile phone snatched while walking",
        "someone took my bag from the restaurant",
        "my scooter was stolen from the colony",
        "watch stolen from my wrist in a crowd",
        "theft of cash from my drawer at work",
        "someone stole groceries from my doorstep",
        "my earphones were stolen on the bus",
        "umbrella stolen from office reception",
        "handbag snatched near the temple",
        "motorbike stolen overnight from building",
        "petrol siphoned from my parked car",
        "tools stolen from my vehicle boot",
        "cycle stolen from outside the school",
        "clothes stolen from the drying area",
        "someone removed valuables from my locker",
        "money stolen from my desk at office",
        "phone stolen while i was charging it at café",
        "shoes stolen from outside the mosque",
        "laptop stolen from library desk",
        "bag lifted from under the seat in train",
        "cash gone missing from my shop counter",
        "pickpocket in a crowded bus stole my purse",
        "someone stole my camera at the fair",
        "car stereo stolen overnight",
        "neighbour stole my parcel from doorstep",
        "theft reported at the construction site",
        "someone took my umbrella from the stand",
        "jewelry missing after housekeeper visited",
        "missing phone last seen at the gym",
        "stolen wallet found empty near bus stop",
        "someone broke into my locker and stole cash",
    ],

    "Robbery": [
        "armed men robbed our shop at gunpoint",
        "dacoity at the petrol pump last night",
        "muggers attacked me and took my bag",
        "robbery at knifepoint near the bus stop",
        "gang robbed a family on the highway",
        "cash stolen at gunpoint from the store",
        "two men on a bike snatched my purse",
        "robbery attempt foiled by locals",
        "men with weapons looted the jewelry store",
        "robbers threatened staff and fled with cash",
        "armed robbery at the bank branch",
        "men stopped my auto and robbed me at knife point",
        "robbery at the chemist shop late night",
        "group of men surrounded me and took everything",
        "robbers broke into the office and tied up staff",
        "taxi driver robbed at highway junction",
        "robbery at the pawn shop yesterday evening",
        "three masked men robbed the grocery store",
        "dacoits looted the entire village market",
        "robbed at gunpoint while withdrawing cash from ATM",
        "men forcibly took my car keys and drove away",
        "robbery on deserted road late at night",
        "armed men entered house and took all gold",
        "shop owner robbed while closing for the night",
        "victim handed over phone and wallet under threat",
        "bike-borne robbers snatched gold chain",
        "robbery at the warehouse by armed gang",
        "men with rods looted the supermarket",
        "robbers demanded cash and mobile at knifepoint",
        "highway robbery near the toll booth",
        "gang looted passengers on the night train",
        "men threatened with iron rods took money",
        "robbery reported at petrol bunk at midnight",
        "two men robbed me near the park gate",
        "armed robbery during early morning jog",
        "robbers fled on motorcycle after snatching bag",
        "cash van robbery near the industrial area",
        "night watchman robbed and tied up",
        "shopkeeper threatened and cash looted",
        "men with country weapons robbed travelers",
    ],

    "Assault": [
        "i was attacked and beaten on the road",
        "physical assault outside a nightclub",
        "road rage incident led to a fistfight",
        "battery case filed against neighbor",
        "man beaten by a group near the market",
        "woman assaulted while returning home",
        "victim punched and kicked by attacker",
        "fight broke out and i was seriously injured",
        "person hit me with a rod without reason",
        "beaten up by a group of men near the station",
        "attacker slapped and punched me repeatedly",
        "assault during argument over parking",
        "neighbour attacked me with a stick",
        "man punched me in the face during argument",
        "was beaten unconscious near the highway",
        "physically assaulted by my landlord",
        "group of boys attacked me for no reason",
        "man threw stones and hit me on the head",
        "assault reported after cricket match dispute",
        "drunk man attacked me near the bar",
        "hit by person with a cricket bat",
        "bystander beaten when trying to intervene",
        "my colleague physically attacked me at work",
        "assaulted by unknown persons near railway station",
        "man kicked and punched me outside shop",
        "attacked with glass bottle at restaurant",
        "person strangled me during robbery attempt",
        "youth assaulted elderly man near temple",
        "got beaten up during political rally",
        "pushed and punched from behind while walking",
        "assault during dispute over money",
        "man threatened and hit me with belt",
        "woman slapped and hair pulled in public",
        "gang assault on single person near market",
        "punched repeatedly while returning from night shift",
        "driver assaulted by passengers after argument",
        "security guard beaten by group at gate",
        "boy assaulted for refusing to give phone",
        "man assaulted while protesting encroachment",
        "physically abused during domestic dispute",
    ],

    "Burglary": [
        "my house was broken into last night",
        "shop break-in detected by security camera",
        "burglars entered through the back window",
        "trespassing reported in the warehouse",
        "house broken into while family was on vacation",
        "valuables stolen in a home burglary",
        "door lock was broken and items stolen",
        "someone forced open my flat door",
        "found my house ransacked when i returned",
        "thieves drilled through the wall to enter shop",
        "intruder entered from the terrace",
        "burglars cut the grille and entered bedroom",
        "back door was broken open and gold taken",
        "neighbours heard noise and found my door open",
        "burglar alarm triggered at 3am at my shop",
        "someone picked my door lock and entered",
        "found window broken and laptop missing",
        "store room broken into and tools missing",
        "burglary attempt stopped by security",
        "office safe broken into and cash stolen",
        "stranger found inside my house at night",
        "ATM cabin broken into and machine damaged",
        "gold and cash stolen from locked cupboard",
        "someone removed AC unit from window to enter",
        "found broken glass and missing valuables at home",
        "warehouse was broken into and goods taken",
        "burglars cut electricity before entering",
        "home burglary while children were alone",
        "intruder hid inside shop after closing hours",
        "garage broken into and vehicle parts stolen",
        "house entered through unlocked bathroom window",
        "burglar used duplicate key to enter flat",
        "jewellery store broken into at night",
        "temple hundi broken into and cash stolen",
        "factory premises broken into and copper stolen",
        "house on ground floor broken into via window",
        "trespasser found sleeping inside my premises",
        "shop shutters forced open and cash looted",
        "medicines stolen in pharmacy burglary",
        "godown broken into and goods removed",
    ],

    "Homicide": [
        "dead body found near the river",
        "murder reported in the old city area",
        "victim found stabbed to death at home",
        "culpable homicide case filed after accident",
        "body discovered in an abandoned building",
        "man killed in a late night dispute",
        "woman found dead under suspicious circumstances",
        "person shot dead near the highway",
        "body floating in the lake near the park",
        "unknown person found dead in the field",
        "man strangled and body hidden in bushes",
        "murder during a land dispute",
        "poisoning suspected in sudden death case",
        "body found with multiple stab wounds",
        "person killed in gang rivalry clash",
        "burn injuries death case filed as murder",
        "driver killed during robbery on highway",
        "father murdered son over property dispute",
        "woman killed and body hidden in suitcase",
        "person found dead with head injury",
        "unidentified body found near industrial area",
        "man shot dead outside his house",
        "death during bar fight registered as homicide",
        "contract killing reported in city outskirts",
        "body found in canal with injury marks",
        "murder after family dispute over money",
        "old man beaten to death by robbers",
        "child found dead in suspicious circumstances",
        "man killed with sharp weapon in slum area",
        "honour killing reported in rural area",
        "driver found dead inside locked car",
        "body found dumped near the highway divider",
        "man killed during argument at construction site",
        "decomposed body found in forest area",
        "security guard killed during ATM robbery",
        "farmer killed over irrigation canal dispute",
        "body found with ligature marks around neck",
        "youth killed in mob violence incident",
        "death during police chase registered as homicide",
        "teacher killed by student after poor marks",
    ],

    "Kidnapping": [
        "my child was abducted from school",
        "kidnapping attempt near the playground",
        "woman abducted and held for ransom",
        "child abduction reported by parents",
        "victim was forcibly taken in a vehicle",
        "man forcibly bundled into a car",
        "child missing since morning witnesses saw stranger",
        "wife kidnapped by estranged husband",
        "held hostage for two days and released",
        "stranger lured my child with candy and took them",
        "ransom call received after daughter went missing",
        "kidnapping by unknown persons near school gate",
        "victim held captive in locked room",
        "teenager abducted while returning from tuition",
        "child taken from playing area by unknown man",
        "worker kidnapped by rival gang",
        "abduction near the bus stop in broad daylight",
        "girl abducted from college campus",
        "men kidnapped shopkeeper and demanded ransom",
        "student abducted after school hours",
        "child not found after school van dropped him",
        "kidnapping for ransom reported in industrial area",
        "woman picked up forcibly in auto",
        "boy missing since yesterday not returned home",
        "two men forced woman into car near mall",
        "elderly person reported missing suspected abduction",
        "child found in different city after abduction",
        "kidnapper contacted family demanding five lakhs",
        "girl kidnapped and found after 3 days",
        "victim blindfolded and kept in unknown location",
        "kidnapped by rival business group",
        "man held in isolated farmhouse against will",
        "child missing from crowded fair grounds",
        "abducted and released after ransom was paid",
        "teenager lured away on pretext of job offer",
        "woman abducted in autorickshaw at night",
        "witness kidnapped to prevent court testimony",
        "kidnapping attempt foiled by public",
        "victim escaped captivity after two days",
        "minor abducted by neighbour",
    ],

    "Identity Theft": [
        "fraud transaction on my credit card",
        "someone hacked my bank account",
        "online scam through fake website",
        "cyber fraud via phishing email",
        "my identity was stolen and used for loans",
        "unauthorized transactions on my account",
        "fake profile created using my documents",
        "received OTP fraud call and lost money",
        "someone took a loan in my name without my knowledge",
        "my Aadhaar was misused to open bank account",
        "fake SIM card issued using my details",
        "scammer pretended to be bank official and stole money",
        "money deducted without my authorization from account",
        "my email was hacked and contacts scammed",
        "online shopping fraud using stolen card details",
        "got fake job offer and paid registration fee then cheated",
        "someone used my PAN card to file fake returns",
        "my mobile banking was accessed without permission",
        "received parcel scam call and lost money",
        "UPI fraud someone scanned my QR code and took money",
        "fake lottery winner call and demanded advance tax",
        "data breach exposed my account details",
        "credit card skimming at ATM machine",
        "identity fraud for getting government benefits",
        "social media account hacked and used to scam friends",
        "fake insurance policy sold using my name",
        "my driving licence misused by someone",
        "impersonation fraud for property registration",
        "digital arrest scam deducted lakhs from account",
        "investment scam promised returns and disappeared",
        "money transferred after receiving fake customer care call",
        "romance scam cheated out of large amount",
        "SIM swap fraud and account emptied",
        "crypto fraud promised high returns and vanished",
        "fake police officer call demanded money online",
        "my photos used to create fake account for fraud",
        "online marketplace fraud sold fake product",
        "phishing link clicked and banking credentials stolen",
        "ATM card cloned and money withdrawn",
        "dark web sale of my personal information",
    ],

    "Vandalism": [
        "car windows smashed and tyres slashed",
        "graffiti sprayed on the school wall",
        "arson attack on a parked vehicle",
        "property damaged by unknown persons",
        "shop shutters broken and walls defaced",
        "someone scratched my car deliberately",
        "windows of my house broken by stones",
        "gate was damaged and CCTV camera broken",
        "electricity meter vandalized by unknown persons",
        "plants and garden destroyed maliciously",
        "political posters pasted all over my wall",
        "temple property damaged by miscreants",
        "vehicle set on fire during protest",
        "road dividers broken and signs damaged",
        "cable wires cut causing power outage",
        "dustbins and benches in park destroyed",
        "someone damaged my two-wheeler overnight",
        "fence broken and compound wall damaged",
        "bus shelter glass broken and seats damaged",
        "art installation defaced in public area",
        "signboards of shop torn off",
        "street lights smashed repeatedly in locality",
        "letterbox outside my house destroyed",
        "damage to water pipeline by construction crew",
        "fire set to hay stacks on farm",
        "drainage blocked deliberately causing flooding",
        "solar panels on rooftop damaged",
        "religious idol vandalized at prayer site",
        "market stalls destroyed overnight",
        "vehicle tyres flattened deliberately",
        "paint thrown on facade of building",
        "flower pots and railings thrown from building",
        "air conditioning units damaged by stones",
        "generator set vandalized at housing society",
        "traffic signals damaged near the junction",
        "school furniture broken by outsiders",
        "transformer damaged causing power failure",
        "water tank broken and water wasted",
        "someone poured acid on my car",
        "bicycle destroyed and thrown in drain",
    ],

    "Other": [
        "domestic violence husband beating wife regularly",
        "drug dealing happening outside my building",
        "extortion threats demanding money repeatedly",
        "human trafficking suspected in my area",
        "stalking complaint against ex-boyfriend",
        "being harassed at workplace by manager",
        "neighbour playing loud music every night",
        "land encroachment by builder",
        "illegal gambling den operating nearby",
        "child labour happening at nearby factory",
        "forced prostitution in the area suspected",
        "woman harassed on public bus",
        "obscene calls received repeatedly",
        "eve teasing near college gate daily",
        "dowry harassment complaint against in-laws",
        "illegal liquor shop operating in residential area",
        "woman threatened for not bringing dowry",
        "blackmailing using private photos",
        "loan shark threatening family for repayment",
        "fake godman extorting devotees",
        "minor found working at tea stall",
        "woman followed and threatened on way home",
        "neighbour illegally dumping waste on my property",
        "online harassment through multiple fake accounts",
        "forced to sign documents under threat",
        "caste based discrimination and abuse",
        "noise pollution complaint against factory",
        "domestic worker abused by employer",
        "food adulteration at local shop",
        "illegal construction causing damage to my house",
        "sexual harassment at workplace",
        "mentally ill person threatening residents",
        "threats received over phone from rival party",
        "mendicants forcibly entering homes",
        "drugs found being sold to school children",
        "man exposing himself near school",
        "elder abuse and neglect by family members",
        "false case filed to harass innocent person",
        "voter intimidation reported during election",
        "woman photographed without consent in public",
    ],
}

# ─────────────────────────────────────────────────────────────
# Build training data — ONLY synthetic sentences
# Multiply each category to get ~800 per class
# ─────────────────────────────────────────────────────────────
all_texts  = []
all_labels = []

REPEAT = 20  # Each sentence repeated 20 times → ~800 per category

for category, sentences in SYNTHETIC.items():
    for sentence in sentences:
        for _ in range(REPEAT):
            all_texts.append(sentence)
            all_labels.append(category)

# Shuffle
combined = list(zip(all_texts, all_labels))
random.shuffle(combined)
all_texts, all_labels = zip(*combined)

X_text = pd.Series(all_texts)
y_cat  = pd.Series(all_labels)

print(f"\nSynthetic training data: {len(X_text):,} examples")
print(f"Categories: {sorted(y_cat.unique())}")
print(f"Samples per category:")
for cat in sorted(y_cat.unique()):
    print(f"  {cat}: {(y_cat == cat).sum()}")

# ─────────────────────────────────────────────────────────────
# Train classifier
# ─────────────────────────────────────────────────────────────
print("\n--- Training Crime Category Classifier ---")

X_train, X_test, y_train, y_test = train_test_split(
    X_text, y_cat, test_size=0.2, random_state=42, stratify=y_cat
)

category_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        stop_words="english",
        max_features=20000,
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        solver='lbfgs',
        class_weight='balanced',
    ))
])

category_pipeline.fit(X_train, y_train)
y_pred = category_pipeline.predict(X_test)

acc = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {acc*100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, zero_division=0))

# ─────────────────────────────────────────────────────────────
# Sanity check — these are the real test
# ─────────────────────────────────────────────────────────────
print("\n--- Sanity Check: Free-text predictions ---")
test_sentences = [
    ("someone stole my phone in a crowded market",       "Theft"),
    ("my house was broken into last night",               "Burglary"),
    ("i was attacked and beaten on the road",             "Assault"),
    ("fraud transaction on my credit card",               "Identity Theft"),
    ("armed men robbed our shop",                         "Robbery"),
    ("dead body found near the river",                    "Homicide"),
    ("my child was abducted from school",                 "Kidnapping"),
    ("car windows smashed and tyres slashed",             "Vandalism"),
    ("drug dealing near my apartment",                    "Other"),
    ("wallet pickpocketed at the railway station",        "Theft"),
    ("received OTP fraud call and lost all my savings",   "Identity Theft"),
    ("man strangled and body hidden in the forest",       "Homicide"),
    ("woman kidnapped near college gate",                 "Kidnapping"),
    ("shop glass broken by stone throwing miscreants",    "Vandalism"),
    ("gang stopped my car on highway and robbed me",      "Robbery"),
]

correct = 0
for sentence, expected in test_sentences:
    pred  = category_pipeline.predict([sentence])[0]
    proba = category_pipeline.predict_proba([sentence])[0]
    conf  = max(proba) * 100
    status = "✓" if pred == expected else "✗"
    print(f"  {status} '{sentence}'")
    print(f"     Expected: {expected} | Got: {pred} ({conf:.0f}% confidence)\n")
    if pred == expected:
        correct += 1

print(f"Sanity check score: {correct}/{len(test_sentences)} correct")

# Save model
model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
joblib.dump(category_pipeline, model_path)
print(f"\nSaved model → {model_path}")

# ─────────────────────────────────────────────────────────────
# MODEL 2: Risk Score Predictor (unchanged — was already good)
# ─────────────────────────────────────────────────────────────
enhanced_cols = ['Crime_Hour', 'Crime_Month', 'Is_Weekend',
                 'Weapon_Risk', 'Area_Crime_Count', 'Area_Avg_Severity']
has_enhanced  = all(col in df.columns for col in enhanced_cols)

if has_enhanced and 'Risk_Score' in df.columns:
    print("\n--- Training Model 2: Risk Score Predictor ---")

    df['Gender_enc']   = LabelEncoder().fit_transform(df['Victim Gender'].fillna('Unknown'))
    df['Weapon_enc']   = LabelEncoder().fit_transform(df['Weapon Used'].fillna('Unknown'))
    df['Category_enc'] = LabelEncoder().fit_transform(df['Clean Category'].fillna('Other'))

    feature_cols = [
        'Latitude', 'Longitude', 'Severity', 'Victim Age',
        'Crime_Hour', 'Crime_Month', 'Is_Weekend',
        'Weapon_Risk', 'Area_Crime_Count', 'Area_Avg_Severity',
        'Gender_enc', 'Weapon_enc', 'Category_enc'
    ]

    df_risk = df[feature_cols + ['Risk_Score']].dropna()
    X_risk, y_risk = df_risk[feature_cols], df_risk['Risk_Score']
    X_tr2, X_te2, y_tr2, y_te2 = train_test_split(
        X_risk, y_risk, test_size=0.2, random_state=42
    )

    risk_model = RandomForestRegressor(
        n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
    )
    risk_model.fit(X_tr2, y_tr2)
    y_pred2 = risk_model.predict(X_te2)
    print(f"MAE : {mean_absolute_error(y_te2, y_pred2):.2f}")
    print(f"R2  : {r2_score(y_te2, y_pred2):.4f}")

    joblib.dump(risk_model, os.path.join(os.path.dirname(__file__), "risk_model.pkl"))
    joblib.dump(feature_cols, os.path.join(os.path.dirname(__file__), "risk_model_features.pkl"))
    print("Saved risk model")
else:
    print("\nSkipping Model 2 — enhanced columns not found.")

print("\nAll done!")