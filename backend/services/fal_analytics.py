"""
fal Analytics Service
Integrates with fal Platform APIs to fetch AI model usage, analytics, and pricing data
"""

import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

# Try both VITE_FAL_KEY (for compatibility) and FAL_KEY
FAL_KEY = os.getenv("FAL_KEY") or os.getenv("VITE_FAL_KEY")
FAL_PLATFORM_API_BASE = "https://api.fal.ai/v1"

class FalAnalyticsService:
    """Service to interact with fal Platform APIs for analytics and usage tracking"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or FAL_KEY
        if not self.api_key:
            print("⚠️  Warning: FAL_KEY not set, fal analytics will not be available")
        else:
            # Debug: print first and last 4 chars of key
            key_preview = f"{self.api_key[:8]}...{self.api_key[-4:]}" if len(self.api_key) > 12 else "***"
            print(f"✅ fal API Key loaded: {key_preview}")
        
        self.headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_model_analytics(
        self,
        model_id: str = "fal-ai/bytedance/seedream/v4/edit",
        timeframe: str = "day",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Fetch analytics for a specific model
        
        Args:
            model_id: The model endpoint ID (e.g., "fal-ai/bytedance/seedream/v4/edit")
            timeframe: Time bucket size - "hour", "day", or "week" (default: "day")
            start_date: Start date in ISO format (default: 7 days ago)
            end_date: End date in ISO format (default: now)
            metrics: List of metrics to include (default: all essential metrics)
        
        Returns:
            Dict containing time-bucketed analytics data
        """
        
        if not self.api_key:
            return {"error": "FAL_KEY not configured"}
        
        # Default metrics if none specified
        if metrics is None:
            metrics = [
                "request_count",
                "success_count",
                "user_error_count",
                "error_count",
                "p50_duration",
                "p90_duration",
                "p50_prepare_duration"
            ]
        
        # Default date range: last 7 days
        # Format: ISO8601 (YYYY-MM-DDTHH:MM:SSZ)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Build query parameters - use 'start' and 'end', not 'start_date' and 'end_date'
        params = {
            "endpoint_id": model_id,
            "timeframe": timeframe,
            "start": start_date,  # Changed from start_date
            "end": end_date,      # Changed from end_date
            "expand": ",".join(metrics)
        }
        
        print(f"🔍 Analytics request params: {params}")
        print(f"🔍 URL: {FAL_PLATFORM_API_BASE}/models/analytics")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{FAL_PLATFORM_API_BASE}/models/analytics",
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 401:
                    print(f"❌ fal analytics API error: 401 - Unauthorized")
                    print(f"💡 This usually means:")
                    print(f"   1. Your API key needs ADMIN scope (not just API scope)")
                    print(f"   2. Generate a new key at: https://fal.ai/dashboard/keys")
                    print(f"   3. Make sure to select 'ADMIN' scope when creating the key")
                    return {"error": "API key needs ADMIN scope for Platform APIs"}
                elif response.status_code == 429:
                    print(f"⏰ fal analytics API: Rate limit exceeded - wait a few minutes")
                    return {"error": "Rate limit exceeded - please wait"}
                else:
                    print(f"❌ fal analytics API error: {response.status_code} - {response.text}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            print(f"❌ Error fetching fal analytics: {e}")
            return {"error": str(e)}
    
    async def get_usage_data(
        self,
        model_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Fetch usage/billing data for model API calls
        
        Args:
            model_id: Optional model endpoint ID to filter by
            start_date: Start date in ISO format
            end_date: End date in ISO format
            limit: Maximum number of usage records to return
        
        Returns:
            Dict containing usage line items with quantities and prices
        """
        
        if not self.api_key:
            return {"error": "FAL_KEY not configured"}
        
        # Default date range: last 30 days
        # Format: ISO8601 (YYYY-MM-DDTHH:MM:SSZ)
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        params = {
            "start": start_date,  # Changed from start_date
            "end": end_date,      # Changed from end_date
            "limit": limit
        }
        
        if model_id:
            params["endpoint_id"] = model_id
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{FAL_PLATFORM_API_BASE}/models/usage",
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 401:
                    print(f"❌ fal usage API error: 401 - Unauthorized")
                    print(f"💡 Your API key needs ADMIN scope for Platform APIs")
                    return {"error": "API key needs ADMIN scope"}
                elif response.status_code == 429:
                    print(f"⏰ fal usage API: Rate limit exceeded - wait a few minutes")
                    return {"error": "Rate limit exceeded - please wait"}
                else:
                    print(f"❌ fal usage API error: {response.status_code} - {response.text}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            print(f"❌ Error fetching fal usage: {e}")
            return {"error": str(e)}
    
    async def get_aggregated_stats(
        self,
        model_id: str = "fal-ai/bytedance/seedream/v4/edit",
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get aggregated analytics stats for easy consumption
        
        Returns simplified metrics like:
        - total_requests
        - total_success
        - total_errors
        - avg_duration
        - success_rate
        - total_cost
        """
        
        # Fetch analytics
        end_date_dt = datetime.now()
        start_date_dt = end_date_dt - timedelta(days=days)
        
        # Format as ISO8601
        end_date_str = end_date_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        start_date_str = start_date_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        analytics = await self.get_model_analytics(
            model_id=model_id,
            timeframe="day",
            start_date=start_date_str,
            end_date=end_date_str
        )
        
        usage = await self.get_usage_data(
            model_id=model_id,
            start_date=start_date_str,
            end_date=end_date_str
        )
        
        # Aggregate metrics from time buckets
        if "error" in analytics or "data" not in analytics:
            return {
                "error": analytics.get("error", "No data available"),
                "total_requests": 0,
                "total_success": 0,
                "total_errors": 0,
                "success_rate": 0,
                "avg_duration_ms": 0,
                "avg_prepare_duration_ms": 0,
                "total_cost_usd": 0.0
            }
        
        buckets = analytics.get("data", [])
        
        total_requests = sum(b.get("request_count", 0) for b in buckets)
        total_success = sum(b.get("success_count", 0) for b in buckets)
        total_user_errors = sum(b.get("user_error_count", 0) for b in buckets)
        total_server_errors = sum(b.get("error_count", 0) for b in buckets)
        
        # Calculate averages
        durations = [b.get("p50_duration") for b in buckets if b.get("p50_duration")]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        prepare_durations = [b.get("p50_prepare_duration") for b in buckets if b.get("p50_prepare_duration")]
        avg_prepare = sum(prepare_durations) / len(prepare_durations) if prepare_durations else 0
        
        success_rate = (total_success / total_requests * 100) if total_requests > 0 else 0
        
        # Calculate total cost from usage data
        total_cost = 0.0
        if "data" in usage:
            for item in usage.get("data", []):
                quantity = item.get("quantity", 0)
                unit_price = item.get("unit_price", 0)
                total_cost += quantity * unit_price
        
        return {
            "total_requests": total_requests,
            "total_success": total_success,
            "total_user_errors": total_user_errors,
            "total_server_errors": total_server_errors,
            "total_errors": total_user_errors + total_server_errors,
            "success_rate": round(success_rate, 2),
            "avg_duration_ms": round(avg_duration, 2),
            "avg_prepare_duration_ms": round(avg_prepare, 2),
            "total_cost_usd": round(total_cost, 4),
            "cost_per_request": round(total_cost / total_requests, 4) if total_requests > 0 else 0
        }

# Global instance
fal_analytics = FalAnalyticsService()

