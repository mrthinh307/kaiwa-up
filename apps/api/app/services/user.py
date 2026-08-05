from app.repositories import UserRepository


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self.repository = repository
