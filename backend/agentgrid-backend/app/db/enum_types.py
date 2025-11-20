from sqlalchemy.dialects import postgresql
from sqlalchemy.types import String, TypeDecorator


class LowercaseEnum(TypeDecorator):
    """Persist Enum values as lowercase strings while using native PostgreSQL enums when available."""

    impl = String
    cache_ok = True

    def __init__(self, enum_class, *, name: str):
        self.enum_class = enum_class
        self.enum_name = name
        self.choices = [member.value for member in enum_class]
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                postgresql.ENUM(*self.choices, name=self.enum_name, create_type=False)
            )
        return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        value_str = str(value).lower()
        if value_str not in self.choices:
            raise ValueError(f"Invalid value '{value}' for enum {self.enum_name}")
        return value_str

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return self.enum_class(value)
