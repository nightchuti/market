import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import AllProducts from "./pages/AllProducts";
import ProductDetail from "./pages/ProductDetail";
import AddProduct from "./pages/MyShop/AddProduct";
import ChatPage from "./pages/ChatPage";
import MyShop from "./pages/MyShop/MyShop";
import ChatFloating from "./pages/ChatFloating";
import Cart from "./pages/Cart";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import EditProduct from "./pages/MyShop/EditProduct";
import PremiumMember from "./pages/PreMember/PremiumMember";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import CouponCenter from "./pages/coupon/CouponCenter";
import AddressPage from "./pages/Checkout/AddressPage";
import PaymentPage from "./pages/Checkout/PaymentPage";
import ShopProfile from "./pages/ShopProfile/ShopProfile";
import SelectTradeProduct from "./pages/SelectTradeProduct";
import AdminRoute from "./components/AdminRoute";
import AdminPanel from "./pages/admin/AdminPanel";
import MembershipPaymentPage from "./pages/PreMember/MembershipPaymentPage";


function App() {
  return (
    <BrowserRouter>
      <ChatFloating />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<AllProducts />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/chat/:roomId" element={<ChatPage />} />
          <Route path="/my-shop" element={<MyShop />} />
          <Route path="/chat-floating" element={<ChatFloating />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
          <Route path="/premium" element={<PremiumMember />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/coupons" element={<CouponCenter />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/address" element={<AddressPage />} />
          <Route path="/profile/:id" element={<ShopProfile />} />
          <Route path="/select-trade-product" element={<SelectTradeProduct />} />
          <Route path="/membership-payment" element={<MembershipPaymentPage />} />

        </Route>

        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
