package sg.nus.carelink.notification.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity for table notification.
 *
 *
 * <p>Generated from V2__care_domain.sql as a starting point; edit freely, it will not
 * be regenerated. Mirrors identity's AppUserJpaEntity: package-private, no domain
 * logic, references to other aggregates are plain ids (DECISION 5 in the schema),
 * so no module depends on another module's persistence classes.
 *
 * <p>The schema is owned by Flyway. Hibernate validates this mapping at start-up
 * and never alters the table.
 */
@Entity
@Table(name = "notification")
class NotificationJpaEntity {

	enum Channel {
		IN_APP, SMS, EMAIL
	}

	enum Status {
		PENDING, SENT, READ, FAILED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** soft FK to app_user.id */
	@Column(name = "recipient_user_id", nullable = false)
	private Long recipientUserId;

	@Column(name = "event_type", nullable = false, length = 40)
	private String eventType;

	@Enumerated(EnumType.STRING)
	@Column(name = "channel", nullable = false)
	private Channel channel = Channel.IN_APP;

	@Column(name = "title", nullable = false, length = 150)
	private String title;

	@Column(name = "body", length = 1000)
	private String body;

	/** what it links to: visit, incident, credential … */
	@Column(name = "resource_type", length = 50)
	private String resourceType;

	@Column(name = "resource_id")
	private Long resourceId;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.PENDING;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "sent_at")
	private LocalDateTime sentAt;

	@Column(name = "read_at")
	private LocalDateTime readAt;

	protected NotificationJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getRecipientUserId() {
		return recipientUserId;
	}

	void setRecipientUserId(Long recipientUserId) {
		this.recipientUserId = recipientUserId;
	}

	String getEventType() {
		return eventType;
	}

	void setEventType(String eventType) {
		this.eventType = eventType;
	}

	Channel getChannel() {
		return channel;
	}

	void setChannel(Channel channel) {
		this.channel = channel;
	}

	String getTitle() {
		return title;
	}

	void setTitle(String title) {
		this.title = title;
	}

	String getBody() {
		return body;
	}

	void setBody(String body) {
		this.body = body;
	}

	String getResourceType() {
		return resourceType;
	}

	void setResourceType(String resourceType) {
		this.resourceType = resourceType;
	}

	Long getResourceId() {
		return resourceId;
	}

	void setResourceId(Long resourceId) {
		this.resourceId = resourceId;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getSentAt() {
		return sentAt;
	}

	void setSentAt(LocalDateTime sentAt) {
		this.sentAt = sentAt;
	}

	LocalDateTime getReadAt() {
		return readAt;
	}

	void setReadAt(LocalDateTime readAt) {
		this.readAt = readAt;
	}
}
