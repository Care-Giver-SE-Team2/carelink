package sg.nus.carelink.notification.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data repository for notification_subscription. Used inside the persistence layer only; never exposed outwards. */
interface NotificationSubscriptionJpaRepository extends JpaRepository<NotificationSubscriptionJpaEntity, Long> {
}
