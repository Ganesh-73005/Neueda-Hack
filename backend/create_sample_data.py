# Sample script to create spam classifier model and phishing URLs dataset
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Create sample spam/ham data
sample_data = [
    ("Congratulations! You've won $1000! Click here to claim", "spam"),
    ("Your account has been suspended. Verify now", "spam"),
    ("Free money! No strings attached!", "spam"),
    ("Meeting scheduled for tomorrow at 3 PM", "ham"),
    ("Your order has been shipped", "ham"),
    ("Thank you for your purchase", "ham"),
    ("URGENT: Your bank account will be closed", "spam"),
    ("Hi, how are you doing today?", "ham"),
    ("Your subscription expires tomorrow", "ham"),
    ("Win big money now! Limited time offer!", "spam")
]

# Create and train the model
texts, labels = zip(*sample_data)
model = Pipeline([
    ('tfidf', TfidfVectorizer()),
    ('classifier', MultinomialNB())
])

model.fit(texts, labels)

# Save the model
joblib.dump(model, 'spam_classifier.pkl')

# Create sample phishing URLs dataset
phishing_urls = [
    "http://fake-bank.com/login",
    "https://phishing-site.net/verify",
    "http://malicious-link.org/download",
    "https://scam-website.com/offer"
]

phishing_df = pd.DataFrame({'url': phishing_urls})
phishing_df.to_csv('phishing_urls.csv', index=False)

print("Sample data created successfully!")
print("- spam_classifier.pkl")
print("- phishing_urls.csv")
