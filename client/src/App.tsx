import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MassTimes from "@/pages/MassTimes";
import Events from "@/pages/Events";
import Gallery from "@/pages/Gallery";
import Bulletins from "@/pages/Bulletins";
import ParishInfo from "@/pages/ParishInfo";
import Priest from "@/pages/Priest";
import Sacraments from "@/pages/Sacraments";
import Ministries from "@/pages/Ministries";
import Rentals from "@/pages/Rentals";
import Settings from "@/pages/Settings";
import Pages from "@/pages/Pages";
import Users from "@/pages/Users";
import PastoralUnit from "@/pages/PastoralUnit";
import Storage from "@/pages/Storage";
import ContactMessages from "@/pages/ContactMessages";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/mass-times">
        <ProtectedRoute><MassTimes /></ProtectedRoute>
      </Route>
      <Route path="/events">
        <ProtectedRoute><Events /></ProtectedRoute>
      </Route>
      <Route path="/gallery">
        <ProtectedRoute><Gallery /></ProtectedRoute>
      </Route>
      <Route path="/bulletins">
        <ProtectedRoute><Bulletins /></ProtectedRoute>
      </Route>
      <Route path="/parish-info">
        <ProtectedRoute><ParishInfo /></ProtectedRoute>
      </Route>
      <Route path="/priest">
        <ProtectedRoute><Priest /></ProtectedRoute>
      </Route>
      <Route path="/sacraments">
        <ProtectedRoute><Sacraments /></ProtectedRoute>
      </Route>
      <Route path="/ministries">
        <ProtectedRoute><Ministries /></ProtectedRoute>
      </Route>
      <Route path="/rentals">
        <ProtectedRoute><Rentals /></ProtectedRoute>
      </Route>
      <Route path="/pages">
        <ProtectedRoute><Pages /></ProtectedRoute>
      </Route>
      <Route path="/contact-messages">
        <ProtectedRoute><ContactMessages /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Settings /></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute><Users /></ProtectedRoute>
      </Route>
      <Route path="/pastoral-unit">
        <ProtectedRoute><PastoralUnit /></ProtectedRoute>
      </Route>
      <Route path="/storage">
        <ProtectedRoute><Storage /></ProtectedRoute>
      </Route>
      <Route path="/login" component={Login} />
      {/* Fallback */}
      <Route>
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminRouter />
      <Toaster />
    </AuthProvider>
  );
}
