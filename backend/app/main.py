from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, profile, birds, recordings, evaluations, admin
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
)

# CORS configuration - must be before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3001",
        "https://canary-singer.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(birds.router)
app.include_router(recordings.router)
app.include_router(evaluations.router)
app.include_router(admin.router)


# Scheduled cleanup task - lazy initialization
scheduler = None


def init_scheduler():
    """Initialize scheduler on app startup"""
    global scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.retention_service import cleanup_expired_media
        from app.db.database import SessionLocal

        scheduler = BackgroundScheduler()

        def scheduled_cleanup():
            """Run cleanup task"""
            db = SessionLocal()
            try:
                result = cleanup_expired_media(db)
                logger.info(f"Cleanup task completed: {result}")
            except Exception as e:
                logger.error(f"Cleanup task error: {str(e)}")
            finally:
                db.close()

        scheduler.add_job(scheduled_cleanup, "interval", hours=1)
        scheduler.start()
        logger.info("Retention cleanup scheduler started")
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {str(e)}")


def init_database():
    """Initialize default data on first run"""
    try:
        from app.db.database import SessionLocal
        from app.models.bird import BirdType
        from app.services.bird_service import create_bird_types

        db = SessionLocal()
        try:
            # Check if bird_types exist
            count = db.query(BirdType).count()
            if count == 0:
                create_bird_types(db)
                logger.info("✓ Bird types initialized")
            else:
                logger.info(f"✓ Database has {count} bird types")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")


@app.on_event("startup")
def startup_event():
    """Initialize database and scheduler on app startup"""
    init_database()
    init_scheduler()


@app.on_event("shutdown")
def shutdown_event():
    """Shutdown scheduler on app shutdown"""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Retention cleanup scheduler stopped")


@app.get("/health")
def health_check():
    return {"status": "ok"}


