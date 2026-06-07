import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export async function seedCaregivers(): Promise<void> {
  try {
    const list = [
      {
        id: 'cg_1_seed',
        full_name: 'Rumana Zaman',
        phone: '+8801711223344',
        area: 'Dhanmondi',
        city: 'Dhaka',
        latitude: 23.7461,
        longitude: 90.3742,
        hourly_rate: 350,
        rating: 4.9,
        experience_years: 12,
        expertise: 'Dementia Care',
        bio: 'Compassionate registered nurse with over 12 years of specialized experience in dementia and Alzheimer\'s memory care.',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cg_2_seed',
        full_name: 'Kazi Masud Rana',
        phone: '+8801811223344',
        area: 'Gulshan',
        city: 'Dhaka',
        latitude: 23.7925,
        longitude: 90.4156,
        hourly_rate: 450,
        rating: 4.8,
        experience_years: 8,
        expertise: 'Post-Stroke Rehab',
        bio: 'Senior physical therapist and nursing supervisor focused on restorative training and post-stroke elderly rehabilitation plans.',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cg_3_seed',
        full_name: 'Farhana Chowdhury',
        phone: '+8801911223344',
        area: 'Uttara',
        city: 'Dhaka',
        latitude: 23.8759,
        longitude: 90.3795,
        hourly_rate: 300,
        rating: 4.9,
        experience_years: 6,
        expertise: 'Palliative Care',
        bio: 'Certified clinical nurse prioritizing holistic senior comfort, pain management assistance, and customized palliative care routines.',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cg_4_seed',
        full_name: 'Anisur Rahman',
        phone: '+8801511223344',
        area: 'Banani',
        city: 'Dhaka',
        latitude: 23.7937,
        longitude: 90.4066,
        hourly_rate: 400,
        rating: 4.7,
        experience_years: 10,
        expertise: 'Geriatric Nursing',
        bio: 'Retired army medical corps sergeant specializing in geriatric medication safety charts, clinical mobility support, and emergency response.',
        is_available: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'cg_5_seed',
        full_name: 'Nusrat Jahan',
        phone: '+8801611223344',
        area: 'Mirpur',
        city: 'Dhaka',
        latitude: 23.8056,
        longitude: 90.3686,
        hourly_rate: 280,
        rating: 4.9,
        experience_years: 5,
        expertise: 'Companion Care',
        bio: 'Warm-hearted senior companion focusing on occupational therapy games, conversational engagement, and nutritional dietary tracking.',
        is_available: true,
        created_at: new Date().toISOString()
      }
    ];

    for (const caregiver of list) {
      const docRef = doc(db, 'caregivers', caregiver.id);
      
      // We overwrite to ensure gender, photo_url and specialties are updated for existing seeds
      const enhancedCaregiver = {
        ...caregiver,
        gender: caregiver.id === 'cg_2_seed' || caregiver.id === 'cg_4_seed' ? 'Male' : 'Female',
        photo_url: caregiver.id === 'cg_1_seed' 
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200'
          : caregiver.id === 'cg_2_seed'
          ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200&h=200'
          : caregiver.id === 'cg_3_seed'
          ? 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200'
          : caregiver.id === 'cg_4_seed'
          ? 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200&h=200'
          : 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200&h=200',
        specialties: [caregiver.expertise]
      };

      await setDoc(docRef, enhancedCaregiver);
    }
  } catch (error) {
    console.warn('Caregiver seeding error (might be secure rules):', error);
  }
}
