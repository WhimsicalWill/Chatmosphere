import { createContext, useState, useEffect } from 'react';
import ApiManager from './ApiManager';

export const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userID, setUserID] = useState(null);

  useEffect(() => {
    (async () => {
      let localUUID = window.localStorage.getItem('uuid');

      if (!localUUID) {
        console.log("No UUID found in local storage");
        localUUID = await ApiManager.createNewUser();  // make a call to ApiManager here
        window.localStorage.setItem('uuid', localUUID);
        console.log("Created new UUID and saved to local storage");
      } else {
        console.log("Found UUID in local storage");
      }

      // Now set it in the state
      setUserID(localUUID);
    })();
  }, []);  // Empty dependency array so this effect only runs once

  return (
    <UserContext.Provider value={{ userID, setUserID }}>
      {children}
    </UserContext.Provider>
  );
}
