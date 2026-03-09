from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.cache_service import get_cached, set_cached

router = APIRouter(prefix="/bestsellers", tags=["Bestsellers"])

@router.get("/", response_model=list[dict])
def get_bestsellers(db: Session = Depends(get_db)):
    cache_key = "bestsellers"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    from app.db.models import Price, Category

    bestsellers = db.query(Price).filter(Price.bestseller == True).all()
    categories = db.query(Category).all()
    category_name_map = {c.id: c.name for c in categories}
    result = []
    for p in bestsellers:
        prices = {}
        if p.price_1kg is not None:
            prices["1Kg"] = p.price_1kg
        if p.price_2kg is not None:
            prices["2Kg"] = p.price_2kg
        if p.price_5kg is not None:
            prices["5Kg"] = p.price_5kg
        result.append({
            "product_id": p.product_id,
            "name": p.product_name,
            "description": p.description,
            "image": p.image,
            "category": category_name_map.get(p.category_id),
            "prices": prices
        })
    set_cached(cache_key, result)
    return result
