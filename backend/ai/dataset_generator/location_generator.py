"""
Location_generator.py
Generates realistic Indian locations (City, State, Location area) for personal finance transactions.
"""

import random
from typing import Dict, List, Tuple

INDIAN_CITIES_STATES: List[Dict[str, str]] = [
    {"city": "Bangalore", "state": "Karnataka", "areas": ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Electronic City", "MG Road", "Jayanagar", "Marathahalli"]},
    {"city": "Hyderabad", "state": "Telangana", "areas": ["HITEC City", "Gachibowli", "Jubilee Hills", "Banjara Hills", "Madhapur", "Kukatpally", "Secunderabad"]},
    {"city": "Delhi NCR", "state": "Delhi", "areas": ["Connaught Place", "Cyber Hub Gurgaon", "Noida Sector 62", "Hauz Khas", "Saket", "Dwarka", "Vasant Kunj"]},
    {"city": "Mumbai", "state": "Maharashtra", "areas": ["Bandra West", "Andheri East", "Lower Parel", "Powai", "Juhu", "BKC", "Dadul", "Colaba"]},
    {"city": "Pune", "state": "Maharashtra", "areas": ["Baner", "Koregaon Park", "Viman Nagar", "Hinjewadi", "Kothrud", "Aundh", "Wakad"]},
    {"city": "Chennai", "state": "Tamil Nadu", "areas": ["T. Nagar", "Velachery", "Adyar", "Anna Nagar", "OMR", "Nungambakkam"]},
    {"city": "Kolkata", "state": "West Bengal", "areas": ["Salt Lake", "Park Street", "New Town", "Ballygunge", "Dum Dum"]},
    {"city": "Ahmedabad", "state": "Gujarat", "areas": ["SG Highway", "Bodakdev", "Navrangpura", "Prahlad Nagar", "Vastrapur"]},
    {"city": "Jaipur", "state": "Rajasthan", "areas": ["Malviya Nagar", "C-Scheme", "Vaishali Nagar", "Raja Park"]},
    {"city": "Lucknow", "state": "Uttar Pradesh", "areas": ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar"]},
    {"city": "Chandigarh", "state": "Punjab", "areas": ["Sector 17", "Sector 35", "Elante Mall Road", "Phase 7 Mohali"]},
    {"city": "Kochi", "state": "Kerala", "areas": ["Marine Drive", "Kakkanad", "Edappally", "MG Road"]},
    {"city": "Indore", "state": "Madhya Pradesh", "areas": ["Vijay Nagar", "Palasia", "MG Road", "Bhawarkua"]}
]


class LocationGenerator:
    def __init__(self):
        self.cities = INDIAN_CITIES_STATES

    def get_random_location(self, preferred_city: str = None) -> Tuple[str, str, str]:
        """
        Returns a tuple of (location_string, city, state).
        E.g. ("Koramangala, Bangalore", "Bangalore", "Karnataka")
        """
        if preferred_city:
            matching = [item for item in self.cities if item["city"].lower() == preferred_city.lower()]
            if matching:
                chosen_item = matching[0]
            else:
                chosen_item = random.choice(self.cities)
        else:
            chosen_item = random.choice(self.cities)

        city = chosen_item["city"]
        state = chosen_item["state"]
        area = random.choice(chosen_item["areas"])
        location_str = f"{area}, {city}"

        return location_str, city, state

    def get_all_cities(self) -> List[str]:
        return [c["city"] for c in self.cities]
