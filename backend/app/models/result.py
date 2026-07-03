# The Result model is defined in app/models/reading.py
# (it shares a file with Reading because both relate directly to LabSession
# and defining them together avoids import-order issues).
#
# This module re-exports it so `from app.models.result import Result` works
# for any code that expects a dedicated result module.
from app.models.reading import Result

__all__ = ["Result"]
