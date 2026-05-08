import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const feedbackSeedData = [
  {
    guest_id: 101,
    name: "Juan Dela Cruz",
    food: { taste_and_flavor: 5, presentation: 5, overall_quality: 4 },
    customer_service: { friendliness: 5, attentiveness: 4, overall_service: 5 },
    serving_time: { waiting_time: 4, speed_of_service: 4 },
    cleanliness: { dining_area: 5, hygiene: 4 },
    ambiance: { atmosphere: 5, comfort_and_environment: 4 },
    comments: "I had a great experience at this café! The food serving was surprisingly big! Definitely more than I expected."
  },
  {
    guest_id: 102,
    name: "user_2",
    food: { taste_and_flavor: 4, presentation: 5, overall_quality: 4 },
    customer_service: { friendliness: 5, attentiveness: 4, overall_service: 5 },
    serving_time: { waiting_time: 4, speed_of_service: 5 },
    cleanliness: { dining_area: 4, hygiene: 5 },
    ambiance: { atmosphere: 5, comfort_and_environment: 4 },
    comments: "Perfect balance of taste and quantity."
  },
  {
    guest_id: 103,
    name: "user_3",
    food: { taste_and_flavor: 4, presentation: 5, overall_quality: 4 },
    customer_service: { friendliness: 4, attentiveness: 3, overall_service: 4 },
    serving_time: { waiting_time: 3, speed_of_service: 4 },
    cleanliness: { dining_area: 4, hygiene: 4 },
    ambiance: { atmosphere: 3, comfort_and_environment: 4 },
    comments: "Dubai Chewy Chocolate yummy"
  },
  {
    guest_id: 104,
    name: "user_4",
    food: { taste_and_flavor: 5, presentation: 5, overall_quality: 5 },
    customer_service: { friendliness: 5, attentiveness: 5, overall_service: 5 },
    serving_time: { waiting_time: 4, speed_of_service: 5 },
    cleanliness: { dining_area: 5, hygiene: 5 },
    ambiance: { atmosphere: 5, comfort_and_environment: 5 },
    comments: "nom nom nom"
  }
];

export const seedFeedbackTable = async () => {
  try {
    const batch = writeBatch(db);
    const feedbackRef = collection(db, "tbl_feedback");

    feedbackSeedData.forEach((feedback) => {
      // Create a new document reference with an auto-generated ID
      const newDocRef = doc(feedbackRef); 
      
      // Append the server timestamp to each record
      const dataWithTimestamp = {
        ...feedback,
        f_timestamp: serverTimestamp()
      };

      batch.set(newDocRef, dataWithTimestamp);
    });

    await batch.commit();
    console.log("tbl_feedback seeded successfully!");
    return { success: true, message: "Feedback data seeded successfully." };
  } catch (error) {
    console.error("Error seeding tbl_feedback:", error);
    return { success: false, message: error.message };
  }
};