package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentJpaEntity;
import sg.nus.carelink.incident.infrastructure.persistence.repository.IncidentJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class IncidentRepositoryAdapterTest {

	private final IncidentJpaRepository jpa = mock(IncidentJpaRepository.class);
	private final IncidentRepositoryAdapter adapter = new IncidentRepositoryAdapter(jpa);

	/**
	 * A row as the database would really hand it back. Every enum column is NOT NULL in V2,
	 * so a half-built entity is not a case the adapter has to survive - and the domain model
	 * refuses one on purpose.
	 */
	private static IncidentJpaEntity row(Long id) {
		IncidentJpaEntity entity = new IncidentJpaEntity();
		entity.setId(id);
		entity.setElderId(7L);
		entity.setSource(IncidentJpaEntity.Source.ELDER_SOS);
		entity.setCategory(IncidentJpaEntity.Category.SOS);
		entity.setSeverity(IncidentJpaEntity.Severity.HIGH);
		entity.setStatus(IncidentJpaEntity.Status.OPEN);
		entity.setReportedAt(LocalDateTime.of(2026, 9, 16, 14, 30));
		return entity;
	}

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		when(jpa.findById(7L)).thenReturn(Optional.of(row(7L)));

		Optional<Incident> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
		assertThat(found.get().severity()).isEqualTo(Incident.Severity.HIGH);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		IncidentJpaEntity entity = row(7L);
		when(jpa.save(any(IncidentJpaEntity.class))).thenReturn(entity);

		Incident saved = adapter.save(IncidentMapper.toDomain(entity));

		assertThat(saved).isNotNull();
		assertThat(saved.id()).isEqualTo(7L);
	}

	@Test
	void theOverdueQueryAsksOnlyForIncidentsNobodyHasTakenOver() {
		LocalDateTime deadline = LocalDateTime.of(2026, 9, 16, 14, 36);
		when(jpa.findByStatusInAndRespondByNotNullAndRespondByLessThanEqualOrderByRespondByAsc(
				anyCollection(), eq(deadline)))
				.thenReturn(List.of(row(7L)));

		List<Incident> overdue = adapter.findAwaitingTakeOverPastDeadline(deadline);

		assertThat(overdue).hasSize(1);

		@SuppressWarnings("unchecked")
		ArgumentCaptor<Collection<IncidentJpaEntity.Status>> statuses =
				ArgumentCaptor.forClass(Collection.class);
		verify(jpa).findByStatusInAndRespondByNotNullAndRespondByLessThanEqualOrderByRespondByAsc(
				statuses.capture(), eq(deadline));
		assertThat(statuses.getValue())
				.containsExactlyInAnyOrder(IncidentJpaEntity.Status.OPEN, IncidentJpaEntity.Status.ACKNOWLEDGED);
	}

	@Test
	void incidentsCanBeListedForOneElder() {
		when(jpa.findByElderIdOrderByReportedAtDesc(7L)).thenReturn(List.of(row(7L), row(8L)));

		assertThat(adapter.findByElder(7L)).hasSize(2);
	}
}
