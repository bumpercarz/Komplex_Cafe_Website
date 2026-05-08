import React, { useState } from 'react';
import { seedFeedbackTable } from '../services/seedFeedbackFirestore'; // Adjust path as needed

const FirestoreFeedbackSeedPage = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSeedDatabase = async () => {
    // Prevent accidental double-clicks
    if (!window.confirm("Are you sure you want to seed tbl_feedback? This will add new records to your database.")) {
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await seedFeedbackTable();

    if (result.success) {
      setStatus({ type: 'success', text: result.message });
    } else {
      setStatus({ type: 'error', text: `Failed to seed: ${result.message}` });
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2>Seed Feedback Database</h2>
      <p>Click the button below to populate <b>tbl_feedback</b> with the initial mockup data.</p>
      
      <button 
        onClick={handleSeedDatabase} 
        disabled={loading}
        style={styles.button}
      >
        {loading ? "Seeding Database..." : "Seed tbl_feedback"}
      </button>

      {status && (
        <div style={{
          ...styles.message, 
          backgroundColor: status.type === 'success' ? '#d4edda' : '#f8d7da',
          color: status.type === 'success' ? '#155724' : '#721c24'
        }}>
          {status.text}
        </div>
      )}
    </div>
  );
};

// Basic inline styles for the seeder page
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
    textAlign: 'center'
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#E87722', // Matched to your mockup's orange
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  message: {
    marginTop: '20px',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid transparent'
  }
};

export default FirestoreFeedbackSeedPage;