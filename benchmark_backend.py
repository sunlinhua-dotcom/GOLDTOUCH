import time
import requests
import sys

def benchmark_endpoint(url, label):
    print(f"Testing {label} [{url}]...")
    start = time.time()
    try:
        response = requests.get(url, timeout=30)
        duration = time.time() - start
        if response.status_code == 200:
            print(f"✅ {label}: {duration:.2f}s (Status: 200)")
            return duration
        else:
            print(f"❌ {label}: Failed - Status {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ {label}: Error - {e}")
        return None

def main():
    print("=== System Latency Monitor ===\n")
    
    # 1. Test Python Backend Root (Health Check)
    benchmark_endpoint("http://localhost:8000/health", "Core Service Health")
    
    # 2. Test Fundamentals Data (AkShare)
    # Using a common stock code
    stock_code = "600519" 
    bench_data = benchmark_endpoint(f"http://localhost:8000/fundamentals/{stock_code}", "AkShare Data Fetch")
    
    # Estimate Total Time
    print("\n=== Latency Estimation ===")
    print(f"1. Data Layer (Real):  {bench_data if bench_data else 'N/A'}s")
    print(f"2. Agent Layer (Est):  ~2.00s")
    print(f"3. Gemini AI (Est):    ~15.00s (Google Cloud)")
    
    total = (bench_data if bench_data else 0) + 2.0 + 15.0
    print(f"--------------------------------")
    print(f"TOTAL PREDICTED:       ~{total:.2f}s")
    print(f"--------------------------------")
    
    if total > 30:
        print("⚠️  Warning: Total time exceeds 30s. Timeout probability high.")
    else:
        print("✅  System speed is within acceptable range.")

if __name__ == "__main__":
    main()
