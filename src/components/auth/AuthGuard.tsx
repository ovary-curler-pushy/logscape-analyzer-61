
import { useUser } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import Loading from "../ui/loading";

const AuthGuard = () => {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <Loading />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
