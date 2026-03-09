from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.cache_service import get_cached, set_cached


router = APIRouter(prefix="/pricing", tags=["Pricing"])

# Categories endpoint
@router.get("/categories", response_model=list[dict])
def get_all_categories(db: Session = Depends(get_db)):
    cache_key = "categories"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached
    from app.db.models import Category

    categories = db.query(Category).order_by(Category.id.asc()).all()
    result = [
        {"id": c.id, "name": c.name, "image": c.image} for c in categories
    ]
    set_cached(cache_key, result)
    return result

@router.get("/", response_model=dict)
def get_all_prices(db: Session = Depends(get_db)):
    cache_key = "prices"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    from app.db.models import Price, Category

    categories = db.query(Category).order_by(Category.id.asc()).all()
    products = db.query(Price).all()
    products_by_category = {}
    for p in products:
        products_by_category.setdefault(p.category_id, []).append(p)

    result = {"categories": []}
    for cat in categories:
        items = []
        category_products = products_by_category.get(cat.id, [])
        for p in category_products:
            prices = {}
            if p.price_1kg is not None:
                prices["1Kg"] = p.price_1kg
            if p.price_2kg is not None:
                prices["2Kg"] = p.price_2kg
            if p.price_5kg is not None:
                prices["5Kg"] = p.price_5kg
            items.append({
                "product_id": p.product_id,
                "name": p.product_name,
                "description": p.description,
                "image": p.image,
                "prices": prices
            })
        result["categories"].append({
            "category": cat.name,
            "items": items
        })
    set_cached(cache_key, result)
    return result
