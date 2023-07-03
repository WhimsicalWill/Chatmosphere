import React, { useContext } from 'react';
import { GoogleLogout } from 'react-google-login';
import { UserContext } from '../UserContext';
// import GitHubLogin from 'react-github-login';

const clientId = "659248674025-16qf4lh1ucjsa65e1j4i9fpv4085tieh.apps.googleusercontent.com";

const Logout = () => {
  const { setUserID } = useContext(UserContext);

  const onSuccessGoogle = (response) => {
    console.log("Logged in with Google successfully");
    setUserID(null);
  }

//   const onSuccessGitHub = (response) => {
//     console.log("Logged in with GitHub successfully");
//   }

  const onFailureGoogle = (response) => {
    console.log("Logging in with Google failed");
  }

//   const onFailureGitHub = (response) => {
//     console.log("Logging in with GitHub failed");
//   }

  return (
    <div className="logout">
      <h2>Logout</h2>
      <GoogleLogout
        clientId={clientId}
        buttonText="Logout with Google"
        onSuccess={onSuccessGoogle}
        onFailure={onFailureGoogle}
        cookiePolicy={'single_host_origin'}
      />
      {/* <GitHubLogin 
        clientId="YOUR_GITHUB_CLIENT_ID" 
        // buttonText="Login with Github"
        onSuccess={onSuccessGitHub}
        onFailure={onFailureGitHub}
      /> */}
    </div>
  );
}

export default Logout;
