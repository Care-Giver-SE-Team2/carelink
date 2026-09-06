package sg.nus.carelink.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for notification. Used inside the persistence layer only; never exposed outwards. */
interface NotificationJpaRepository extends JpaRepository<NotificationJpaEntity, Long> {
}
