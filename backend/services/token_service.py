"""
Token Management Service
Handles token deduction, addition, and balance management
"""
import asyncpg
from typing import Dict, List, Optional
from datetime import datetime
import json


class TokenService:
    """Service for managing user tokens"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
    
    # ========================================================================
    # TOKEN BALANCE
    # ========================================================================
    
    async def get_balance(self, user_id: int) -> int:
        """Get current token balance for a user"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT tokens_remaining FROM users WHERE id = $1",
                user_id
            )
            return result if result is not None else 0
    
    async def check_sufficient_balance(self, user_id: int, required_tokens: int) -> bool:
        """Check if user has sufficient tokens"""
        balance = await self.get_balance(user_id)
        return balance >= required_tokens
    
    # ========================================================================
    # TOKEN DEDUCTION
    # ========================================================================
    
    async def deduct_tokens(
        self,
        user_id: int,
        amount: int,
        description: str,
        metadata: Dict = None
    ) -> Dict:
        """
        Deduct tokens from user balance
        Returns: {success: bool, balance_after: int, transaction_id: int}
        """
        async with self.db_pool.acquire() as conn:
            try:
                # Use the database function for atomic operation
                result = await conn.fetchrow(
                    """
                    SELECT deduct_tokens($1, $2, $3, $4) as success,
                           tokens_remaining as balance_after
                    FROM users
                    WHERE id = $1
                    """,
                    user_id,
                    amount,
                    description,
                    json.dumps(metadata or {})
                )
                
                # Get the transaction ID
                transaction = await conn.fetchrow(
                    """
                    SELECT id FROM token_transactions
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    user_id
                )
                
                return {
                    "success": True,
                    "balance_after": result["balance_after"],
                    "transaction_id": transaction["id"] if transaction else None
                }
            except asyncpg.exceptions.RaiseError as e:
                # Handle insufficient balance or other errors
                error_msg = str(e)
                if "Insufficient tokens" in error_msg:
                    balance = await self.get_balance(user_id)
                    return {
                        "success": False,
                        "error": "insufficient_balance",
                        "message": error_msg,
                        "balance": balance,
                        "required": amount
                    }
                else:
                    return {
                        "success": False,
                        "error": "deduction_failed",
                        "message": error_msg
                    }
    
    async def deduct_for_generation(
        self,
        user_id: int,
        model_name: str,
        event_id: Optional[str] = None,
        photo_id: Optional[str] = None
    ) -> Dict:
        """Deduct tokens for an AI generation"""
        # Get cost for this model (checks custom pricing first)
        cost = await self.get_model_cost(model_name, user_id)
        
        metadata = {
            "model": model_name,
            "event_id": event_id,
            "photo_id": photo_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        description = f"AI generation using {model_name}"
        if event_id:
            description += f" for event {event_id}"
        
        return await self.deduct_tokens(user_id, cost, description, metadata)
    
    # ========================================================================
    # TOKEN ADDITION
    # ========================================================================
    
    async def add_tokens(
        self,
        user_id: int,
        amount: int,
        transaction_type: str,  # 'purchase', 'bonus', 'refund'
        description: str,
        metadata: Dict = None
    ) -> Dict:
        """
        Add tokens to user balance
        Returns: {success: bool, balance_after: int, transaction_id: int}
        """
        async with self.db_pool.acquire() as conn:
            try:
                # Use the database function for atomic operation
                result = await conn.fetchrow(
                    """
                    SELECT add_tokens($1, $2, $3, $4, $5) as success,
                           tokens_remaining as balance_after
                    FROM users
                    WHERE id = $1
                    """,
                    user_id,
                    amount,
                    transaction_type,
                    description,
                    json.dumps(metadata or {})
                )
                
                # Get the transaction ID
                transaction = await conn.fetchrow(
                    """
                    SELECT id FROM token_transactions
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    user_id
                )
                
                return {
                    "success": True,
                    "balance_after": result["balance_after"],
                    "transaction_id": transaction["id"] if transaction else None
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": "addition_failed",
                    "message": str(e)
                }
    
    async def add_tokens_for_purchase(
        self,
        user_id: int,
        tokens: int,
        payment_id: int,
        package_name: str
    ) -> Dict:
        """Add tokens after successful purchase"""
        metadata = {
            "payment_id": payment_id,
            "package": package_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        description = f"Purchased {package_name} ({tokens} tokens)"
        
        return await self.add_tokens(user_id, tokens, "purchase", description, metadata)
    
    async def add_bonus_tokens(
        self,
        user_id: int,
        tokens: int,
        reason: str
    ) -> Dict:
        """Add bonus tokens (promotional, compensation, etc.)"""
        metadata = {
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        description = f"Bonus tokens: {reason}"
        
        return await self.add_tokens(user_id, tokens, "bonus", description, metadata)
    
    # ========================================================================
    # TRANSACTION HISTORY
    # ========================================================================
    
    async def get_transaction_history(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get transaction history for a user"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    id,
                    amount,
                    transaction_type,
                    description,
                    balance_after,
                    metadata,
                    created_at
                FROM token_transactions
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                user_id,
                limit,
                offset
            )
            
            return [dict(row) for row in rows]
    
    async def get_total_spent(self, user_id: int) -> int:
        """Get total tokens spent by user"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval(
                """
                SELECT COALESCE(SUM(ABS(amount)), 0)
                FROM token_transactions
                WHERE user_id = $1 AND transaction_type = 'generation'
                """,
                user_id
            )
            return result or 0
    
    async def get_total_purchased(self, user_id: int) -> int:
        """Get total tokens purchased by user"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval(
                """
                SELECT COALESCE(SUM(amount), 0)
                FROM token_transactions
                WHERE user_id = $1 AND transaction_type = 'purchase'
                """,
                user_id
            )
            return result or 0
    
    # ========================================================================
    # TOKEN PACKAGES
    # ========================================================================
    
    async def get_token_packages(self, active_only: bool = True) -> List[Dict]:
        """Get available token packages"""
        async with self.db_pool.acquire() as conn:
            query = """
                SELECT 
                    id,
                    name,
                    description,
                    tokens,
                    price_usd,
                    stripe_price_id,
                    is_active
                FROM token_packages
            """
            
            if active_only:
                query += " WHERE is_active = TRUE"
            
            query += " ORDER BY tokens ASC"
            
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]
    
    async def get_package_by_id(self, package_id: int) -> Optional[Dict]:
        """Get a specific token package"""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    id,
                    name,
                    description,
                    tokens,
                    price_usd,
                    stripe_price_id,
                    is_active
                FROM token_packages
                WHERE id = $1
                """,
                package_id
            )
            return dict(row) if row else None
    
    # ========================================================================
    # AI MODEL COSTS
    # ========================================================================
    
    async def get_model_cost(self, model_name: str, user_id: int = None) -> int:
        """Get token cost for a specific AI model, checking custom pricing first"""
        async with self.db_pool.acquire() as conn:
            # First check for custom pricing if user_id provided
            if user_id:
                custom_cost = await conn.fetchval(
                    """
                    SELECT token_cost
                    FROM custom_user_pricing
                    WHERE user_id = $1 AND model_id = $2 AND is_active = TRUE
                    """,
                    user_id, model_name
                )
                if custom_cost is not None:
                    return custom_cost
            
            # Fall back to default pricing
            result = await conn.fetchval(
                """
                SELECT cost_per_generation
                FROM ai_generation_costs
                WHERE model_name = $1 AND is_active = TRUE
                """,
                model_name
            )
            
            # Default cost if model not found
            return result if result is not None else 5
    
    async def get_all_model_costs(self) -> List[Dict]:
        """Get costs for all AI models"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    model_name,
                    cost_per_generation,
                    description,
                    is_active
                FROM ai_generation_costs
                WHERE is_active = TRUE
                ORDER BY cost_per_generation ASC
                """
            )
            return [dict(row) for row in rows]
    
    # ========================================================================
    # ANALYTICS
    # ========================================================================
    
    async def get_user_stats(self, user_id: int) -> Dict:
        """Get comprehensive stats for a user"""
        async with self.db_pool.acquire() as conn:
            stats = await conn.fetchrow(
                """
                SELECT 
                    u.tokens_remaining as current_balance,
                    COALESCE(SUM(tt.amount) FILTER (WHERE tt.transaction_type = 'purchase'), 0) as total_purchased,
                    COALESCE(SUM(ABS(tt.amount)) FILTER (WHERE tt.transaction_type = 'generation'), 0) as total_spent,
                    COUNT(*) FILTER (WHERE tt.transaction_type = 'generation') as total_generations,
                    COALESCE(SUM(sp.amount_usd), 0) as total_money_spent
                FROM users u
                LEFT JOIN token_transactions tt ON u.id = tt.user_id
                LEFT JOIN stripe_payments sp ON u.id = sp.user_id AND sp.status = 'succeeded'
                WHERE u.id = $1
                GROUP BY u.id, u.tokens_remaining
                """,
                user_id
            )
            
            return dict(stats) if stats else {
                "current_balance": 0,
                "total_purchased": 0,
                "total_spent": 0,
                "total_generations": 0,
                "total_money_spent": 0
            }


# Singleton instance
_token_service = None

def get_token_service(db_pool: asyncpg.Pool) -> TokenService:
    """Get or create the token service singleton"""
    global _token_service
    if _token_service is None:
        _token_service = TokenService(db_pool)
    return _token_service

