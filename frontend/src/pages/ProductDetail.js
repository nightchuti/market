import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/products/${id}`)
      .then(res => setProduct(res.data));
  }, [id]);

  if (!product) return null;

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <p>฿{product.price}</p>
      {product.exchangeable && <p>🔄 สินค้านี้แลกเปลี่ยนได้</p>}
    </div>
  );
}
