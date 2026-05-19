import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};

// --- Service Functions ---

export const getCompetitionSettings = async () => {
  const path = 'settings/competition';
  try {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const subscribeToSettings = (callback: (data: any) => void) => {
  return onSnapshot(doc(db, 'settings/competition'), (snap) => {
    if (snap.exists()) callback(snap.data());
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'settings/competition');
  });
};

export const subscribeToMatches = (callback: (data: any[]) => void) => {
  const q = query(collection(db, 'matches'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(matches);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'matches');
  });
};

export const subscribeToParticipants = (callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, 'participants'), (snap) => {
    const p = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(p);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'participants');
  });
};

export const castVote = async (matchId: string, juryId: string, vote: 'red' | 'blue') => {
  const path = `matches/${matchId}/votes/${juryId}`;
  try {
    await setDoc(doc(db, path), {
      juryId,
      matchId,
      vote,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const finalizeMatchByJury = async (matchId: string, juryId: string, finishedJuries: string[]) => {
  const path = `matches/${matchId}`;
  try {
    const newFinished = Array.from(new Set([...finishedJuries, juryId]));
    await updateDoc(doc(db, path), {
      finishedJuries: newFinished
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateCompetitionSettings = async (settings: any) => {
  const path = 'settings/competition';
  try {
    await setDoc(doc(db, path), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateParticipants = async (participants: any[]) => {
  try {
    for (const p of participants) {
      await setDoc(doc(db, `participants/${p.id}`), p);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'participants');
  }
};

export const updateMatches = async (matches: any[]) => {
  try {
    for (const m of matches) {
      // Ensure all fields are present for validation
      const matchData = {
        ...m,
        redVotes: m.redVotes || 0,
        blueVotes: m.blueVotes || 0,
        winnerId: m.winnerId || null,
        roundResults: m.roundResults || [],
        finishedJuries: m.finishedJuries || [],
        order: m.order || 0
      };
      await setDoc(doc(db, `matches/${m.id}`), matchData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'matches');
  }
};

export const updateMatchStatus = async (matchId: string, status: string, additionalFields: any = {}) => {
  const path = `matches/${matchId}`;
  try {
    await updateDoc(doc(db, path), {
      status,
      ...additionalFields
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToVotes = (matchId: string, callback: (votes: Record<string, string>) => void) => {
  const path = `matches/${matchId}/votes`;
  return onSnapshot(collection(db, path), (snap) => {
    const votes: Record<string, string> = {};
    snap.docs.forEach(d => {
      votes[d.id] = d.data().vote;
    });
    callback(votes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const deleteVotesForMatch = async (matchId: string) => {
  const path = `matches/${matchId}/votes`;
  try {
    const snap = await getDocs(collection(db, path));
    // Import deleteDoc dynamically or add to imports
    const { deleteDoc } = await import('firebase/firestore');
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
