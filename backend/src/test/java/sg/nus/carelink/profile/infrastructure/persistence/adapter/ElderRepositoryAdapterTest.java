package sg.nus.carelink.profile.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.infrastructure.persistence.entity.ElderJpaEntity;
import sg.nus.carelink.profile.infrastructure.persistence.repository.ElderJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class ElderRepositoryAdapterTest {

	private final ElderJpaRepository jpa = mock(ElderJpaRepository.class);
	private final ElderRepositoryAdapter adapter = new ElderRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		ElderJpaEntity entity = new ElderJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<Elder> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		ElderJpaEntity entity = new ElderJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(ElderJpaEntity.class))).thenReturn(entity);

		Elder saved = adapter.save(ElderMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
